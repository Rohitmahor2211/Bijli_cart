import crypto from "crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { calculateOrderCommission } from "../utils/commission.js";
import { Order } from "../models/order.model.js";
import { Payment } from "../models/payment.model.js";
import { SellerLedger } from "../models/sellerLedger.model.js";
import {
  commitReservedStockToSale,
  releaseReservedStock,
} from "./inventory.service.js";
import { getOrderNotificationDetails, notifyBuyer, notifyPlatformAdmins, notifySeller } from "./notification.service.js";
import { logger } from "../utils/logger.js";

const paymentError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

export const createProviderOrder = async (payment) => {
  if (env.NODE_ENV === 'test' && process.env.TEST_PROVIDER_ORDER_FAILURE === 'true') {
    throw paymentError('Gateway unavailable for test', 502);
  }
  if (payment.provider === "MOCK") {
    payment.providerOrderId = `mock_${payment.checkoutReference}`;
    await payment.save();
    return {
      keyId: "",
      providerOrderId: payment.providerOrderId,
      amount: payment.amount * 100,
      currency: payment.currency,
      mock: true,
    };
  }

  const credentials = Buffer.from(
    `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(payment.amount * 100),
      currency: payment.currency,
      receipt: payment.checkoutReference,
      notes: { checkoutReference: payment.checkoutReference },
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.id)
    throw paymentError(
      body.error?.description || "Unable to start Razorpay payment.",
      502,
    );
  payment.providerOrderId = body.id;
  await payment.save();
  return {
    keyId: env.RAZORPAY_KEY_ID,
    providerOrderId: body.id,
    amount: body.amount,
    currency: body.currency,
    mock: false,
  };
};

export const captureMarketplacePayment = async ({
  payment,
  providerPaymentId = "",
  providerOrderId = "",
  signature = "",
  mock = false,
  trustedProviderEvent = false,
}) => {
  logger.info('[PAYMENT] Capture requested', {
    paymentId: payment._id,
    checkoutReference: payment.checkoutReference,
    provider: payment.provider,
    amount: payment.amount,
    orderIds: payment.orderIds,
  });
  if (payment.status === "CAPTURED") return payment;
  if (payment.status !== "CREATED")
    throw paymentError(
      "This payment cannot be captured in its current state.",
      409,
    );

  if (payment.provider === "MOCK") {
    if (!mock)
      throw paymentError(
        "Mock payment confirmation is not allowed in this environment.",
        403,
      );
    providerOrderId =
      payment.providerOrderId || `mock_${payment.checkoutReference}`;
    providerPaymentId =
      providerPaymentId || `mock_pay_${payment.checkoutReference}`;
  } else if (!trustedProviderEvent) {
    if (
      !providerPaymentId ||
      !providerOrderId ||
      !signature ||
      providerOrderId !== payment.providerOrderId
    )
      throw paymentError("Payment verification details are invalid.", 400);
    const expected = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest("hex");
    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    )
      throw paymentError("Payment signature verification failed.", 400);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await Payment.findById(payment._id).session(session);
      if (!current || current.status === "CAPTURED") return;
      if (current.status !== "CREATED")
        throw paymentError(
          "This payment cannot be captured in its current state.",
          409,
        );
      const orders = await Order.find({
        _id: { $in: current.orderIds },
        paymentStatus: "PENDING",
      }).session(session);
      if (orders.length !== current.orderIds.length)
        throw paymentError("Associated orders are no longer payable.", 409);
      const availableAt = new Date();
      for (const order of orders) {
        const details = await getOrderNotificationDetails(order);
        for (const item of order.items)
          await commitReservedStockToSale({
            retailerId: order.retailerId,
            productId: item.productId,
            quantity: item.quantity,
            session,
          });
        order.paymentStatus = "PAID";
        order.orderStatus = "CONFIRMED";
        order.buyerCancellationDeadline = null;
        order.sellerPaymentStatus = 'PENDING';
        order.refundStatus = 'NOT_REQUIRED';
        order.timeline.push({
          status: "CONFIRMED",
          comment: "Online payment verified; seller fulfilment can begin.",
        });
        await order.save({ session });
        logger.info('[PAYMENT] Seller order paid and confirmed', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          retailerId: order.retailerId,
          buyerId: order.buyerId,
          amount: order.grandTotal,
          status: order.orderStatus,
          products: order.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
        });
        await notifySeller({
          retailerId: order.retailerId,
          type: "NEW_ORDER",
          title: "New paid order",
          message: `Order ${details.orderNumber} is ready for fulfilment. Seller: ${details.sellerName} (${details.shopName}). Product: ${details.productSummary}. Amount: ₹${details.orderTotal.toLocaleString("en-IN")}.`,
          metadata: { orderId: order._id },
        });
        await notifyPlatformAdmins({
          type: "PAYMENT_RECEIVED",
          title: "Buyer payment received",
          message: `₹${order.grandTotal.toLocaleString("en-IN")} credited for ${details.orderNumber}. Seller: ${details.sellerName} (${details.shopName}). Product: ${details.productSummary}.`,
          metadata: {
            orderId: order._id,
            orderNumber: details.orderNumber,
            amount: order.grandTotal,
            sellerName: details.sellerName,
            shopName: details.shopName,
            products: details.products,
            badge: "PAID",
          },
        });
        await notifyBuyer({
          buyerId: order.buyerId,
          type: "PAYMENT_DEBITED",
          title: "Payment debited successfully",
          message: `₹${order.grandTotal.toLocaleString("en-IN")} was debited for order ${order.orderNumber}.`,
          metadata: { orderId: order._id, paymentId: current._id },
        });
        await notifyBuyer({
          buyerId: order.buyerId,
          type: "ORDER_CONFIRMED",
          title: "Order confirmed",
          message: `Your order ${order.orderNumber} has been confirmed.`,
          metadata: { orderId: order._id },
        });
        await notifySeller({
          retailerId: order.retailerId,
          type: "PAYMENT_RECEIVED",
          title: "Payment received",
          message: `Payment of ₹${details.orderTotal.toLocaleString("en-IN")} for ${details.orderNumber} was received for ${details.productSummary}. The amount is held for settlement.`,
          metadata: { orderId: order._id, paymentId: current._id },
        });
        const commission = await calculateOrderCommission(order);
        await SellerLedger.create(
          [
            {
              retailerId: order.retailerId,
              orderId: order._id,
              paymentId: current._id,
              entryType: "SALE",
              amount: order.grandTotal,
              status: "PENDING",
              availableAt,
              idempotencyKey: `${current.id}:sale:${order.id}`,
              metadata: { checkoutReference: current.checkoutReference },
            },
            {
              retailerId: order.retailerId,
              orderId: order._id,
              paymentId: current._id,
              entryType: "COMMISSION",
              amount: -commission,
              status: "PENDING",
              availableAt,
              idempotencyKey: `${current.id}:commission:${order.id}`,
              metadata: { percent: order.subtotal ? Number(((commission / order.subtotal) * 100).toFixed(2)) : 0, categoryBased: true },
            },
          ],
          { session, ordered: true },
        );
      }
      current.status = "CAPTURED";
      current.providerOrderId = providerOrderId;
      current.providerPaymentId = providerPaymentId;
      current.providerSignature = signature;
      current.capturedAt = new Date();
      await current.save({ session });
    });
  } finally {
    await session.endSession();
  }
  return Payment.findById(payment._id);
};

export const failMarketplacePayment = async ({
  payment,
  reason = "Payment was not completed.",
}) => {
  if (!payment || payment.status === "CAPTURED" || payment.status === "FAILED")
    return payment;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await Payment.findById(payment._id).session(session);
      if (
        !current ||
        current.status === "CAPTURED" ||
        current.status === "FAILED"
      )
        return;
      const orders = await Order.find({
        _id: { $in: current.orderIds },
        paymentStatus: "PENDING",
      }).session(session);
      for (const order of orders) {
        for (const item of order.items)
          await releaseReservedStock({
            retailerId: order.retailerId,
            productId: item.productId,
            quantity: item.quantity,
            session,
          });
        order.paymentStatus = "FAILED";
        order.orderStatus = "CANCELLED";
        order.sellerPaymentStatus = "CANCELLED";
        order.timeline.push({
          status: "CANCELLED",
          comment: "Payment failed or was cancelled; reserved stock released.",
        });
        await order.save({ session });
      }
      current.status = "FAILED";
      current.failureReason = reason.slice(0, 500);
      await current.save({ session });
    });
  } finally {
    await session.endSession();
  }
  return Payment.findById(payment._id);
};

export const cancelMarketplacePayment = (args) =>
  failMarketplacePayment({ ...args, reason: args.reason || "Payment was cancelled before completion." });

const updateRefundPaymentStatus = (payment) => {
  const refundedAmount = (payment.refunds ?? [])
    .filter((entry) => entry.status !== "FAILED")
    .reduce((total, entry) => total + Number(entry.amount || 0), 0);
  payment.status =
    refundedAmount >= Number(payment.amount) - 0.01
      ? "REFUNDED"
      : "PARTIALLY_REFUNDED";
};

export const requestMarketplaceRefund = async ({ order, reason }) => {
  if (!order.paymentId || order.paymentStatus !== "PAID") return null;
  let payment = await Payment.findById(order.paymentId);
  const existing = (payment?.refunds ?? []).find(
    (refund) =>
      String(refund.orderId) === String(order._id) &&
      refund.status !== "FAILED",
  );
  if (existing) return { payment, refund: existing, alreadyRequested: true };
  if (!payment || !["CAPTURED", "PARTIALLY_REFUNDED"].includes(payment.status))
    throw paymentError("The original payment cannot be refunded.", 409);
  if (payment.provider === "RAZORPAY" && !payment.providerPaymentId) {
    throw paymentError("This paid order has no Razorpay payment ID, so it cannot be refunded automatically. Reconcile the payment before cancelling.", 409);
  }
  if (payment.provider === "RAZORPAY" && (!Number.isFinite(Number(order.grandTotal)) || Number(order.grandTotal) <= 0)) {
    throw paymentError("This order has an invalid refund amount. Reconcile the order total before cancelling.", 409);
  }
  const alreadyRefundedAmount = (payment.refunds ?? [])
    .filter((entry) => entry.status !== "FAILED")
    .reduce((total, entry) => total + Number(entry.amount || 0), 0);
  if (alreadyRefundedAmount + Number(order.grandTotal) > Number(payment.amount)) {
    throw paymentError("The requested refund exceeds the remaining captured payment amount. Reconcile the payment before cancelling.", 409);
  }

  payment = await Payment.findOneAndUpdate(
    {
      _id: order.paymentId,
      status: { $in: ["CAPTURED", "PARTIALLY_REFUNDED"] },
      refunds: { $not: { $elemMatch: { orderId: order._id, status: { $ne: "FAILED" } } } },
    },
    { $push: { refunds: { orderId: order._id, amount: order.grandTotal, reason, status: "REQUESTED" } } },
    { returnDocument: "after" },
  );
  if (!payment) {
    payment = await Payment.findById(order.paymentId);
    const concurrentRefund = payment?.refunds.find(
      (refund) => String(refund.orderId) === String(order._id) && refund.status !== "FAILED",
    );
    if (concurrentRefund) return { payment, refund: concurrentRefund, alreadyRequested: true };
    throw paymentError("The refund could not be claimed for processing.", 409);
  }
  const refund = payment.refunds.find((entry) => String(entry.orderId) === String(order._id) && entry.status === "REQUESTED");
  if (!refund) throw paymentError("A refund request is already being processed.", 409);
  const persistedRefund = refund;
  if (payment.provider === "MOCK") {
    persistedRefund.providerRefundId = `mock_refund_${order.id}`;
    persistedRefund.status = "PROCESSED";
    updateRefundPaymentStatus(payment);
    await payment.save();
    await voidCommissionForRefund(order);
    logger.info("Refund completed by mock provider", {
      source: "src/services/payment.service.js:337",
      orderId: String(order._id),
      paymentId: String(payment._id),
      refundAmount: Number(order.grandTotal),
      refundStatus: persistedRefund.status,
      providerRefundId: persistedRefund.providerRefundId,
    });
    return { payment, refund: persistedRefund, processed: true };
  }
  const credentials = Buffer.from(
    `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${payment.providerPaymentId}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(order.grandTotal * 100),
        notes: { orderId: order.id, reason },
      }),
    },
  );
  logger.info("Razorpay refund API call completed", {
    source: "src/services/payment.service.js:360",
    orderId: String(order._id),
    paymentId: String(payment._id),
    providerPaymentId: payment.providerPaymentId,
    refundAmount: Number(order.grandTotal),
    razorpayHttpStatus: response.status,
  });
  const rawProviderResponse = await response.text();
  let providerRefund;
  try {
    providerRefund = rawProviderResponse ? JSON.parse(rawProviderResponse) : {};
  } catch {
    providerRefund = { error: { description: rawProviderResponse } };
  }
  if (!response.ok) {
    persistedRefund.status = "FAILED";
    const providerMessage =
      providerRefund.error?.description ||
      providerRefund.error?.reason ||
      `Razorpay refund request failed with status ${response.status}.`;
    persistedRefund.reason = providerMessage;
    await payment.save();
    const actionableMessage = /invalid request sent/i.test(providerMessage)
      ? "Razorpay rejected this refund request. Confirm that the payment is captured, the Razorpay payment ID is valid, and the order amount does not exceed the remaining captured amount."
      : `Razorpay could not process the refund: ${providerMessage}`;
    throw paymentError(actionableMessage, 502);
  }
  if (!providerRefund.id) {
    persistedRefund.status = "FAILED";
    persistedRefund.reason = "Razorpay did not return a refund ID.";
    await payment.save();
    throw paymentError(persistedRefund.reason, 502);
  }
  persistedRefund.providerRefundId = providerRefund.id;
  persistedRefund.status =
    providerRefund.status === "processed" ? "PROCESSED" : "REQUESTED";
  // A successful Razorpay refund creation is already a partial refund for this
  // combined checkout, even when Razorpay will complete it asynchronously.
  updateRefundPaymentStatus(payment);
  await payment.save();
  await voidCommissionForRefund(order);
  logger.info("Razorpay refund recorded locally", {
    source: "src/services/payment.service.js:397",
    orderId: String(order._id),
    paymentId: String(payment._id),
    refundAmount: Number(order.grandTotal),
    refundStatus: persistedRefund.status,
    providerRefundId: persistedRefund.providerRefundId,
    paymentStatus: payment.status,
  });
  return {
    payment,
    refund: persistedRefund,
    processed: persistedRefund.status === "PROCESSED",
  };
};

export const voidCommissionForRefund = async (order, session = null) => {
  const options = session ? { session } : {};
  await SellerLedger.updateMany(
    {
      orderId: order._id,
      entryType: "COMMISSION",
      status: { $in: ["PENDING", "AVAILABLE", "RESERVED"] },
    },
    {
      $set: {
        status: "VOID",
        "metadata.refundStatus": "REQUESTED",
        "metadata.cancelledAt": new Date(),
      },
    },
    options,
  );
};

export const reverseSellerLedgerForRefund = async ({ order, paymentId, session = null }) => {
  await voidCommissionForRefund(order, session);
  const query = SellerLedger.findOne({
    orderId: order._id,
    entryType: "REFUND",
  });
  if (session) query.session(session);
  const existing = await query;
  if (existing) return existing;
  const commissionEntryQuery = SellerLedger.findOne({
    orderId: order._id,
    entryType: "COMMISSION",
    status: { $ne: "VOID" },
  }).select("amount");
  if (session) commissionEntryQuery.session(session);
  const commissionEntry = await commissionEntryQuery;
  const commission = commissionEntry
    ? Math.abs(Number(commissionEntry.amount))
    : Number(((order.subtotal * env.PLATFORM_COMMISSION_PERCENT) / 100).toFixed(2));
  const availableAt = new Date();
  try {
    const entries = await SellerLedger.create([
      {
        retailerId: order.retailerId,
        orderId: order._id,
        paymentId,
        entryType: "REFUND",
        amount: -order.grandTotal,
        status: "AVAILABLE",
        availableAt,
        idempotencyKey: `${paymentId}:refund:${order.id}`,
        metadata: { reason: order.returnRequest?.reason || "Order refund" },
      },
      {
        retailerId: order.retailerId,
        orderId: order._id,
        paymentId,
        entryType: "ADJUSTMENT",
        amount: commission,
        status: "AVAILABLE",
        availableAt,
        idempotencyKey: `${paymentId}:refund-commission:${order.id}`,
        metadata: { reason: "Commission reversal" },
      },
    ], session ? { session, ordered: true } : undefined);
    return entries[0];
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const duplicate = await SellerLedger.findOne({ orderId: order._id, entryType: "REFUND" }).session(session || null);
    if (!duplicate) throw error;
    return duplicate;
  }
};

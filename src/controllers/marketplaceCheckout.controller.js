import { Payment } from "../models/payment.model.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { createMarketplaceCheckout } from "../services/marketplaceCheckout.service.js";
import {
  captureMarketplacePayment,
  cancelMarketplacePayment,
  createProviderOrder,
} from "../services/payment.service.js";
import { env } from "../config/env.js";

const paymentView = (payment) => ({
  checkoutReference: payment.checkoutReference,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
  provider: payment.provider,
  orderIds: payment.orderIds,
});

export const createCheckout = asyncWrapper(async (req, res) => {
  const idempotencyKey = req.get("Idempotency-Key");
  const { items, shippingAddress } = req.body;
  const result = await createMarketplaceCheckout({
    buyer: req.buyer,
    items,
    shippingAddress,
    paymentMethod: "UPI",
    idempotencyKey,
  });
  const payment = result.payment;
  let gateway;
  try {
    gateway =
      result.reused && payment.providerOrderId
        ? {
            keyId: payment.provider === "RAZORPAY" ? env.RAZORPAY_KEY_ID : "",
            providerOrderId: payment.providerOrderId,
            amount: Math.round(payment.amount * 100),
            currency: payment.currency,
            mock: payment.provider === "MOCK",
          }
        : await createProviderOrder(payment);
  } catch (providerError) {
    try {
      await cancelMarketplacePayment({
        payment,
        reason: `Provider order creation failed: ${providerError.message}`,
      });
    } catch (cleanupError) {
      providerError.statusCode = 500;
      providerError.message =
        "Payment provider order creation failed and checkout cleanup could not be completed. Please contact support.";
      providerError.cleanupError = cleanupError.message;
    }
    throw providerError;
  }
  return sendSuccess(
    res,
    result.reused ? "Existing checkout returned." : "Checkout created.",
    {
      payment: paymentView(payment),
      gateway,
      orders: result.orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        sellerId: order.retailerId,
        total: order.grandTotal,
      })),
    },
    result.reused ? 200 : 201,
  );
});

export const verifyCheckoutPayment = asyncWrapper(async (req, res) => {
  const payment = await Payment.findOne({
    checkoutReference: req.body.checkoutReference,
    buyerId: req.buyer._id,
  });
  if (!payment)
    return sendError(res, "Checkout payment was not found.", null, 404);
  const captured = await captureMarketplacePayment({
    payment,
    providerPaymentId: req.body.razorpayPaymentId,
    providerOrderId: req.body.razorpayOrderId,
    signature: req.body.razorpaySignature,
    mock: req.body.mock === true,
  });
  return sendSuccess(res, "Payment verified and seller orders confirmed.", {
    payment: paymentView(captured),
  });
});

export const cancelCheckoutPayment = asyncWrapper(async (req, res) => {
  const payment = await Payment.findOne({
    checkoutReference: req.body.checkoutReference,
    buyerId: req.buyer._id,
  });
  if (!payment)
    return sendError(res, "Checkout payment was not found.", null, 404);
  const cancelled = await cancelMarketplacePayment({
    payment,
    reason: "Payment was cancelled before completion.",
  });
  return sendSuccess(res, "Payment cancellation recorded and reserved stock released.", {
    payment: paymentView(cancelled),
  });
});

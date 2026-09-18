import crypto from 'crypto';
import { env } from '../config/env.js';
import { Payment } from '../models/payment.model.js';
import { PayoutRequest } from '../models/payoutRequest.model.js';
import { SellerLedger } from '../models/sellerLedger.model.js';
import { captureMarketplacePayment, failMarketplacePayment, reverseSellerLedgerForRefund } from '../services/payment.service.js';
import { Order } from '../models/order.model.js';
import { notifyBuyer, notifySeller } from '../services/notification.service.js';
import { WebhookEvent } from '../models/webhookEvent.model.js';

const updateRefundPaymentStatus = (payment) => {
  const refundedAmount = (payment.refunds ?? [])
    .filter((entry) => entry.status !== 'FAILED')
    .reduce((total, entry) => total + Number(entry.amount || 0), 0);
  payment.status = refundedAmount >= Number(payment.amount) - 0.01
    ? 'REFUNDED'
    : 'PARTIALLY_REFUNDED';
};

export const razorpayWebhook = async (req, res, next) => {
  let webhookEvent;
  try {
    if (env.PAYMENT_PROVIDER !== 'razorpay') return res.status(204).end();
    const event = JSON.parse(req.body.toString('utf8'));
    const isPayoutEvent = event.event?.startsWith('payout.');
    const webhookSecret = isPayoutEvent
      ? (env.RAZORPAYX_WEBHOOK_SECRET || env.RAZORPAY_WEBHOOK_SECRET)
      : env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.get('x-razorpay-signature') || '';
    const expected = crypto.createHmac('sha256', webhookSecret).update(req.body).digest('hex');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).json({ success: false, data: null, message: 'Invalid webhook signature.', errors: [] });
    const eventId = req.get('x-razorpay-event-id');
    if (eventId) {
      try {
        webhookEvent = await WebhookEvent.create({ provider: 'RAZORPAY', eventId, eventType: event.event });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        webhookEvent = await WebhookEvent.findOne({ provider: 'RAZORPAY', eventId });
        if (webhookEvent?.status === 'PROCESSED') {
          return res.status(200).json({ success: true, data: null, message: 'Duplicate webhook ignored.', errors: [] });
        }
      }
    }
    const markProcessed = async () => {
      if (!webhookEvent) return;
      webhookEvent.status = 'PROCESSED';
      webhookEvent.processedAt = new Date();
      webhookEvent.failureReason = '';
      await webhookEvent.save();
    };
    const refundEntity = event.payload?.refund?.entity;
    if (refundEntity?.id && (event.event === 'refund.processed' || event.event === 'refund.failed')) {
      const payment = await Payment.findOne({ 'refunds.providerRefundId': refundEntity.id });
      if (!payment) { await markProcessed(); return res.status(200).json({ success: true, data: null, message: 'Refund not found locally.', errors: [] }); }
      const refund = payment.refunds.find((entry) => entry.providerRefundId === refundEntity.id);
      if (event.event === 'refund.failed') {
        refund.status = 'FAILED';
        refund.reason = refundEntity.notes?.reason || 'Razorpay reported a failed refund.';
        await payment.save();
        const failedOrder = await Order.findById(refund.orderId);
        if (failedOrder) {
          failedOrder.refundStatus = 'FAILED';
          failedOrder.refund = {
            ...(failedOrder.refund?.toObject?.() || failedOrder.refund || {}),
            failureReason: refund.reason,
          };
          await failedOrder.save();
          await notifyBuyer({ buyerId: failedOrder.buyerId, type: 'REFUND_UPDATED', title: 'Refund needs attention', message: `The refund for ${failedOrder.orderNumber} could not be completed yet. Our support team will review it.`, metadata: { orderId: failedOrder._id, refundId: refundEntity.id } });
          await notifySeller({ retailerId: failedOrder.retailerId, type: 'ORDER_CANCELLED', title: 'Refund requires review', message: `The refund for cancelled order ${failedOrder.orderNumber} requires platform review.`, metadata: { orderId: failedOrder._id, refundId: refundEntity.id } });
        }
        await markProcessed();
        return res.status(200).json({ success: true, data: null, message: 'Refund failure recorded.', errors: [] });
      }
      if (refund.status !== 'PROCESSED') {
        refund.status = 'PROCESSED';
        updateRefundPaymentStatus(payment);
        await payment.save();
        const order = await Order.findById(refund.orderId);
        if (order) {
          order.paymentStatus = 'REFUNDED';
          order.refundStatus = 'COMPLETED';
          order.refund = {
            ...(order.refund?.toObject?.() || order.refund || {}),
            amount: refund.amount,
            providerRefundId: refundEntity.id,
            completedAt: new Date(),
          };
          if (order.returnRequest?.status === 'RECEIVED') order.returnRequest.status = 'REFUNDED';
          order.timeline.push({ status: 'REFUNDED', comment: 'Razorpay refund processed.' });
          await order.save();
          await reverseSellerLedgerForRefund({ order, paymentId: payment._id });
          await notifyBuyer({ buyerId: order.buyerId, type: 'REFUND_UPDATED', title: 'Refund credited', message: `Your refund for ${order.orderNumber} has been processed and credited by Razorpay.`, metadata: { orderId: order._id, refundId: refundEntity.id } });
          await notifySeller({ retailerId: order.retailerId, type: 'ORDER_CANCELLED', title: 'Refund completed', message: `Refund for cancelled order ${order.orderNumber} is complete. Settlement entries were reversed.`, metadata: { orderId: order._id, refundId: refundEntity.id } });
        }
      }
      await markProcessed();
      return res.status(200).json({ success: true, data: null, message: 'Refund webhook processed.', errors: [] });
    }
    const payoutEntity = event.payload?.payout?.entity;
    if (payoutEntity?.id && (event.event === 'payout.processed' || event.event === 'payout.failed')) {
      const payout = await PayoutRequest.findOne({ transferReference: payoutEntity.id, status: 'PROCESSING' });
      if (!payout) { await markProcessed(); return res.status(200).json({ success: true, data: null, message: 'Payout not found locally.', errors: [] }); }
      if (event.event === 'payout.processed') {
        payout.status = 'PAID'; payout.processedAt = new Date(); await payout.save();
        await SellerLedger.updateMany({ _id: { $in: payout.ledgerEntryIds }, status: 'RESERVED' }, { $set: { status: 'PAID' } });
      } else {
        payout.status = 'FAILED'; payout.failureReason = payoutEntity.failure_reason || 'RazorpayX reported a failed payout.'; await payout.save();
        await SellerLedger.updateMany({ _id: { $in: payout.ledgerEntryIds }, status: 'RESERVED' }, { $set: { status: 'AVAILABLE' }, $unset: { 'metadata.payoutRequestId': '' } });
      }
      await markProcessed();
      return res.status(200).json({ success: true, data: null, message: 'Payout webhook processed.', errors: [] });
    }
    const entity = event.payload?.payment?.entity;
    if (!entity?.order_id) { await markProcessed(); return res.status(200).json({ success: true, data: null, message: 'Event ignored.', errors: [] }); }
    const payment = await Payment.findOne({ provider: 'RAZORPAY', providerOrderId: entity.order_id });
    if (!payment) { await markProcessed(); return res.status(200).json({ success: true, data: null, message: 'Payment not found locally.', errors: [] }); }
    if (event.event === 'payment.captured') await captureMarketplacePayment({ payment, providerPaymentId: entity.id, providerOrderId: entity.order_id, trustedProviderEvent: true });
    if (event.event === 'payment.failed') await failMarketplacePayment({ payment, reason: entity.error_description || 'Razorpay reported a failed payment.' });
    await markProcessed();
    return res.status(200).json({ success: true, data: null, message: 'Webhook processed.', errors: [] });
  } catch (error) {
    if (webhookEvent) {
      webhookEvent.status = 'FAILED';
      webhookEvent.failureReason = String(error.message || error).slice(0, 500);
      await webhookEvent.save();
    }
    return next(error);
  }
};

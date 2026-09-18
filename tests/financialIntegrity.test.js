import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Inventory } from '../src/models/inventory.model.js';
import { Payment } from '../src/models/payment.model.js';
import { Order } from '../src/models/order.model.js';
import { failMarketplacePayment, requestMarketplaceRefund } from '../src/services/payment.service.js';
import { reserveStock } from '../src/services/inventory.service.js';
import { canTransitionOrder } from '../src/utils/orderTransitions.js';
import { reserveAutomaticPayout } from '../src/services/settlement.service.js';
import { reverseSellerLedgerForRefund } from '../src/services/payment.service.js';
import { razorpayWebhook } from '../src/controllers/razorpayWebhook.controller.js';
import { SellerLedger } from '../src/models/sellerLedger.model.js';
import { PayoutRequest } from '../src/models/payoutRequest.model.js';
import { env } from '../src/config/env.js';
import crypto from 'crypto';

describe('Financial and inventory integrity', () => {
  it('allows only valid order transitions', () => {
    expect(canTransitionOrder('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransitionOrder('SHIPPED', 'OUT_FOR_DELIVERY')).toBe(true);
    expect(canTransitionOrder('OUT_FOR_DELIVERY', 'DELIVERED')).toBe(true);
    expect(canTransitionOrder('DELIVERED', 'PROCESSING')).toBe(false);
    expect(canTransitionOrder('CANCELLED', 'CONFIRMED')).toBe(false);
  });

  it('allows concurrent reservations only up to available stock', async () => {
    const retailerId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    await Inventory.create({ retailerId, productId, currentStock: 1, reservedStock: 0 });

    const results = await Promise.allSettled([
      reserveStock({ retailerId, productId, quantity: 1 }),
      reserveStock({ retailerId, productId, quantity: 1 }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const inventory = await Inventory.findOne({ retailerId, productId });
    expect(inventory.reservedStock).toBe(1);
    await Inventory.deleteOne({ _id: inventory._id });
  });

  it('does not create duplicate refunds for the same order', async () => {
    const buyerId = new mongoose.Types.ObjectId();
    const retailerId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    const checkoutReference = `TEST-CHK-${paymentId}`;

    await Order.create({
      _id: orderId,
      orderNumber: `TEST-ORD-${orderId}`,
      retailerId,
      buyerId,
      customerId,
      paymentId,
      items: [{ productId, productName: 'Test product', sku: 'TEST-SKU', quantity: 1, price: 100, subtotal: 100 }],
      subtotal: 100,
      grandTotal: 100,
      paymentStatus: 'PAID',
      paymentMethod: 'UPI',
      orderStatus: 'CONFIRMED',
      shippingAddress: { street: 'Test street', city: 'Delhi', state: 'Delhi', pincode: '110001' },
    });

    await Payment.create({
      _id: paymentId,
      checkoutReference,
      buyerId,
      orderIds: [orderId],
      amount: 100,
      provider: 'MOCK',
      status: 'CAPTURED',
      idempotencyKey: `TEST-IDEMP-${paymentId}`,
    });

    const order = await Order.findById(orderId);
    const first = await requestMarketplaceRefund({ order, reason: 'Test refund' });
    const second = await requestMarketplaceRefund({ order, reason: 'Retry refund' });

    expect(first.processed).toBe(true);
    expect(second.alreadyRequested).toBe(true);
    const payment = await Payment.findById(paymentId);
    expect(payment.refunds).toHaveLength(1);
    expect(payment.status).toBe('REFUNDED');

    await Payment.deleteOne({ _id: paymentId });
    await Order.deleteOne({ _id: orderId });
  });

  it('cancels pending checkout orders and releases reserved stock', async () => {
    const buyerId = new mongoose.Types.ObjectId();
    const retailerId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    await Inventory.create({ retailerId, productId, currentStock: 1, reservedStock: 1 });
    await Order.create({
      _id: orderId, orderNumber: `CANCEL-ORD-${orderId}`, retailerId, buyerId, customerId, paymentId,
      items: [{ productId, productName: 'Cancelled product', sku: 'CANCEL-SKU', quantity: 1, price: 100, subtotal: 100 }],
      subtotal: 100, grandTotal: 100, paymentStatus: 'PENDING', paymentMethod: 'UPI', orderStatus: 'PENDING',
      shippingAddress: { street: 'Test street', city: 'Delhi', state: 'Delhi', pincode: '110001' },
    });
    const payment = await Payment.create({
      _id: paymentId, checkoutReference: `CANCEL-CHK-${paymentId}`, buyerId, orderIds: [orderId],
      amount: 100, provider: 'MOCK', status: 'CREATED', idempotencyKey: `CANCEL-IDEMP-${paymentId}`,
    });
    await failMarketplacePayment({ payment, reason: 'Buyer cancelled Razorpay checkout.' });
    const cancelledOrder = await Order.findById(orderId);
    const cancelledPayment = await Payment.findById(paymentId);
    const inventory = await Inventory.findOne({ retailerId, productId });
    expect(cancelledOrder.paymentStatus).toBe('FAILED');
    expect(cancelledOrder.orderStatus).toBe('CANCELLED');
    expect(cancelledPayment.status).toBe('FAILED');
    expect(inventory.reservedStock).toBe(0);
    expect(inventory.currentStock).toBe(1);
    await Payment.deleteOne({ _id: paymentId });
    await Order.deleteOne({ _id: orderId });
    await Inventory.deleteOne({ retailerId, productId });
  });

  it('allows only one concurrent payout reservation for the same ledger entries', async () => {
    const retailerId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    await SellerLedger.create({
      retailerId, orderId, paymentId, entryType: 'SALE', amount: 100,
      status: 'AVAILABLE', idempotencyKey: `payout-test-${new mongoose.Types.ObjectId()}`,
    });
    const results = await Promise.all([
      reserveAutomaticPayout(retailerId),
      reserveAutomaticPayout(retailerId),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await PayoutRequest.countDocuments({ retailerId })).toBe(1);
    expect(await SellerLedger.countDocuments({ retailerId, status: 'RESERVED' })).toBe(1);
    await PayoutRequest.deleteMany({ retailerId });
    await SellerLedger.deleteMany({ retailerId });
  });

  it('creates only one refund ledger entry pair when reversal is retried concurrently', async () => {
    const retailerId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    const order = { _id: orderId, id: orderId.toString(), retailerId, subtotal: 100, grandTotal: 100 };
    await Promise.all([
      reverseSellerLedgerForRefund({ order, paymentId }),
      reverseSellerLedgerForRefund({ order, paymentId }),
    ]);
    expect(await SellerLedger.countDocuments({ orderId, entryType: 'REFUND' })).toBe(1);
    expect(await SellerLedger.countDocuments({ orderId, entryType: 'ADJUSTMENT' })).toBe(1);
    await SellerLedger.deleteMany({ orderId });
  });

  it('marks payout success webhook and ledger entries as paid', async () => {
    const retailerId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    const ledger = await SellerLedger.create({
      retailerId, orderId, paymentId, entryType: 'SALE', amount: 100,
      status: 'RESERVED', idempotencyKey: `webhook-success-${new mongoose.Types.ObjectId()}`,
    });
    const payout = await PayoutRequest.create({
      retailerId, amount: 100, ledgerEntryIds: [ledger._id], status: 'PROCESSING', transferReference: `payout-success-${new mongoose.Types.ObjectId()}`,
    });
    const previousProvider = env.PAYMENT_PROVIDER;
    const previousSecret = env.RAZORPAY_WEBHOOK_SECRET;
    const previousRazorpayXSecret = env.RAZORPAYX_WEBHOOK_SECRET;
    env.PAYMENT_PROVIDER = 'razorpay';
    env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
    env.RAZORPAYX_WEBHOOK_SECRET = 'test-webhook-secret';
    const body = Buffer.from(JSON.stringify({ event: 'payout.processed', payload: { payout: { entity: { id: payout.transferReference } } } }));
    const eventId = `payout-success-event-${new mongoose.Types.ObjectId()}`;
    const req = { body, get: (name) => name === 'x-razorpay-signature' ? crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex') : eventId };
    const response = await invokeWebhook(req);
    expect(response.statusCode).toBe(200);
    expect((await invokeWebhook(req)).payload.message).toBe('Duplicate webhook ignored.');
    expect((await PayoutRequest.findById(payout._id)).status).toBe('PAID');
    expect((await SellerLedger.findById(ledger._id)).status).toBe('PAID');
    env.PAYMENT_PROVIDER = previousProvider;
    env.RAZORPAY_WEBHOOK_SECRET = previousSecret;
    env.RAZORPAYX_WEBHOOK_SECRET = previousRazorpayXSecret;
    await PayoutRequest.deleteOne({ _id: payout._id });
    await SellerLedger.deleteOne({ _id: ledger._id });
  });

  it('marks payout failure webhook and releases reserved ledger entries', async () => {
    const retailerId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    const ledger = await SellerLedger.create({
      retailerId, orderId, paymentId, entryType: 'SALE', amount: 100,
      status: 'RESERVED', idempotencyKey: `webhook-failure-${new mongoose.Types.ObjectId()}`,
      metadata: { payoutRequestId: 'temporary' },
    });
    const payout = await PayoutRequest.create({
      retailerId, amount: 100, ledgerEntryIds: [ledger._id], status: 'PROCESSING', transferReference: `payout-failure-${new mongoose.Types.ObjectId()}`,
    });
    const previousProvider = env.PAYMENT_PROVIDER;
    const previousSecret = env.RAZORPAY_WEBHOOK_SECRET;
    const previousRazorpayXSecret = env.RAZORPAYX_WEBHOOK_SECRET;
    env.PAYMENT_PROVIDER = 'razorpay';
    env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
    env.RAZORPAYX_WEBHOOK_SECRET = 'test-webhook-secret';
    const body = Buffer.from(JSON.stringify({ event: 'payout.failed', payload: { payout: { entity: { id: payout.transferReference, failure_reason: 'Bank rejected payout' } } } }));
    const eventId = `payout-failure-event-${new mongoose.Types.ObjectId()}`;
    const req = { body, get: (name) => name === 'x-razorpay-signature' ? crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex') : eventId };
    const response = await invokeWebhook(req);
    expect(response.statusCode).toBe(200);
    expect((await PayoutRequest.findById(payout._id)).status).toBe('FAILED');
    expect((await SellerLedger.findById(ledger._id)).status).toBe('AVAILABLE');
    env.PAYMENT_PROVIDER = previousProvider;
    env.RAZORPAY_WEBHOOK_SECRET = previousSecret;
    env.RAZORPAYX_WEBHOOK_SECRET = previousRazorpayXSecret;
    await PayoutRequest.deleteOne({ _id: payout._id });
    await SellerLedger.deleteOne({ _id: ledger._id });
  });
});

const invokeWebhook = (req) => new Promise((resolve, reject) => {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { resolve({ statusCode: this.statusCode, payload }); return this; },
    end() { resolve({ statusCode: this.statusCode }); return this; },
  };
  razorpayWebhook(req, res, reject);
});

import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    logistics: {
      weightKg: { type: Number, default: 0.5 },
      lengthCm: { type: Number, default: 20 },
      breadthCm: { type: Number, default: 15 },
      heightCm: { type: Number, default: 10 },
    },
  },
  { _id: true }
);

const timelineSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    comment: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Retailer',
      required: true,
      index: true,
    },
    checkoutReference: { type: String, default: '', index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null, index: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', default: null, index: true },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    buyerCancellationDeadline: { type: Date, default: null, index: true },
    acceptedAt: { type: Date, default: null },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', default: null },
    deliveredAt: { type: Date, default: null },
    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', default: null },
    sellerPaymentStatus: {
      type: String,
      enum: ['NOT_APPLICABLE', 'CANCELLED', 'PENDING', 'COMPLETED'],
      default: 'PENDING',
      index: true,
    },
    sellerPayment: {
      amount: { type: Number, default: 0, min: 0 },
      method: { type: String, enum: ['CASH', 'BANK_TRANSFER', 'ONLINE'], default: null },
      reference: { type: String, trim: true, default: '' },
      paidAt: { type: Date, default: null },
      paidByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin', default: null },
      notes: { type: String, trim: true, default: '' },
    },
    cancellation: {
      cancelledBy: { type: String, enum: ['BUYER', 'RETAILER', 'ADMIN', 'SYSTEM'], default: null },
      cancelledById: { type: mongoose.Schema.Types.ObjectId, default: null },
      reason: { type: String, trim: true, default: '' },
      cancelledAt: { type: Date, default: null },
    },
    refundStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'NOT_REQUIRED',
      index: true,
    },
    refund: {
      amount: { type: Number, default: 0, min: 0 },
      providerRefundId: { type: String, trim: true, default: '' },
      initiatedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      failureReason: { type: String, trim: true, default: '' },
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER'],
      default: 'UPI',
    },
    orderStatus: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'ACCEPTED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
      default: 'PENDING',
      index: true,
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    shipment: {
      provider: { type: String, default: '' },
      providerOrderId: { type: String, default: '' },
      providerShipmentId: { type: String, default: '' },
      carrier: { type: String, default: '', trim: true },
      trackingNumber: { type: String, default: '', trim: true },
      trackingUrl: { type: String, default: '', trim: true },
      labelUrl: { type: String, default: '', trim: true },
      pickupScheduledAt: { type: Date, default: null },
      shippedAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
    },
    returnShipment: {
      provider: { type: String, default: '' },
      trackingNumber: { type: String, default: '' },
      labelUrl: { type: String, default: '' },
      pickupScheduledAt: { type: Date, default: null },
    },
    returnRequest: {
      status: { type: String, enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED'], default: 'NONE' },
      reason: { type: String, default: '', trim: true },
      requestedAt: { type: Date, default: null },
      decisionAt: { type: Date, default: null },
      receivedAt: { type: Date, default: null },
      sellerNote: { type: String, default: '', trim: true },
    },
    timeline: [timelineSchema],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ retailerId: 1, orderNumber: 1 });
orderSchema.index({ retailerId: 1, orderStatus: 1, createdAt: -1 });
orderSchema.index({ retailerId: 1, customerId: 1, createdAt: -1 });
orderSchema.index({ checkoutReference: 1, retailerId: 1 });

export const Order = mongoose.model('Order', orderSchema);

import mongoose from 'mongoose';

const sellerLedgerSchema = new mongoose.Schema(
  {
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    entryType: { type: String, enum: ['SALE', 'COMMISSION', 'TAX', 'REFUND', 'PAYOUT', 'ADJUSTMENT'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR', uppercase: true },
    status: { type: String, enum: ['PENDING', 'AVAILABLE', 'RESERVED', 'PAID', 'VOID'], default: 'PENDING', index: true },
    availableAt: { type: Date, default: null },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

sellerLedgerSchema.index({ retailerId: 1, status: 1, availableAt: 1 });

export const SellerLedger = mongoose.model('SellerLedger', sellerLedgerSchema);

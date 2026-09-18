import mongoose from 'mongoose';

const buyerSavedAddressSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true, index: true },
  label: { type: String, trim: true, default: 'Home' },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

buyerSavedAddressSchema.index({ buyerId: 1, createdAt: -1 });

export const BuyerAddress = mongoose.model('BuyerAddress', buyerSavedAddressSchema);

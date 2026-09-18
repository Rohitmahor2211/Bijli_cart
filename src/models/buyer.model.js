import mongoose from 'mongoose';

const buyerAddressSchema = new mongoose.Schema({
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
}, { _id: false });

const buyerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, unique: true, index: true },
  email: { type: String, trim: true, lowercase: true, default: '' },
  city: { type: String, required: true, trim: true },
  defaultAddress: { type: buyerAddressSchema, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Buyer = mongoose.model('Buyer', buyerSchema);

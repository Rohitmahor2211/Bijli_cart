import mongoose from "mongoose";

const sellerRegistrationSchema = new mongoose.Schema({
  retailerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Retailer",
    required: true,
  },
  basicDetails: {
    shopName: String,
    ownerName: String,
    phone: String,
    email: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    gstNumber: String,
    panNumber: String,
    mainCategory: String,
    deliveryPreference: {
      type: String,
      enum: ["SELLER_DELIVERY", "AVNISH_DELIVERY"],
    },
  },
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branchName: String,
  },
  agreement: { accepted: Boolean, acceptedAt: Date },
  documents: [
    { docType: String, url: String, publicId: String, status: String },
  ],
  otpVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const SellerRegistration = mongoose.model(
  "SellerRegistration",
  sellerRegistrationSchema,
);

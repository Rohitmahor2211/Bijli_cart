import mongoose from 'mongoose';

const retailerSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true,
    },
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    shopLogo: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    address: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    pincode: { type: String, trim: true, required: true, match: /^\d{6}$/ },
    gstNumber: { type: String, trim: true, uppercase: true, default: '', match: /^$|^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/ },
    panNumber: { type: String, trim: true, uppercase: true, required: true, match: /^[A-Z]{5}\d{4}[A-Z]$/ },
    businessHours: { type: String, trim: true, default: '9:00 AM - 9:00 PM' },
    mainCategory: { type: String, trim: true, required: true },
    deliveryPreference: {
      type: String,
      enum: ['SELLER_DELIVERY', 'AVNISH_DELIVERY'],
      default: 'SELLER_DELIVERY',
    },
    bankDetails: {
      accountHolderName: { type: String, trim: true, required: true },
      // Legacy field: excluded by default and retained only until its encrypted
      // replacement is migrated. New registrations never store this value.
      accountNumber: { type: String, trim: true, select: false, default: '' },
      accountNumberEncrypted: { type: String, select: false, default: '' },
      accountNumberLast4: { type: String, trim: true, default: '', match: /^\d{4}$/ },
      ifscCode: { type: String, trim: true, uppercase: true, required: true, match: /^[A-Z]{4}0[A-Z0-9]{6}$/ },
      bankName: { type: String, trim: true, required: true },
      branchName: { type: String, trim: true, required: true },
      upiId: { type: String, trim: true, lowercase: true, default: '', match: /^$|^[\w.-]+@[\w.-]+$/ },
    },
    payoutProviderFundAccountId: { type: String, default: '', select: false },
    sellerAgreement: {
      accepted: { type: Boolean, required: true, validate: { validator: (value) => value === true, message: 'Seller agreement must be accepted' } },
      acceptedAt: { type: Date, required: true },
    },
    documents: [
      {
        docType: { type: String, enum: ['PAN', 'GST', 'BUSINESS_PROOF'], required: true },
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        status: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
      },
    ],
    sellerStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
      index: true,
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

retailerSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  if (obj.bankDetails) {
    delete obj.bankDetails.accountNumberEncrypted;
    obj.bankDetails.accountNumber = obj.bankDetails.accountNumberLast4 ? `XXXXXX${obj.bankDetails.accountNumberLast4}` : 'Hidden';
  }
  return obj;
};

export const Retailer = mongoose.model('Retailer', retailerSchema);

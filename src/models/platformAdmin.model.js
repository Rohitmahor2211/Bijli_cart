import mongoose from "mongoose";

const platformAdminSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    passwordHash: { type: String, select: false },
    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "OPERATIONS_ADMIN",
        "CATALOG_ADMIN",
        "SUPPORT_ADMIN",
      ],
      default: "OPERATIONS_ADMIN",
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

platformAdminSchema.methods.toJSON = function () {
  const value = this.toObject();
  return value;
};

export const PlatformAdmin = mongoose.model(
  "PlatformAdmin",
  platformAdminSchema,
);

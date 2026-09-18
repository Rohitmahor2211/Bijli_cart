import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['SUPPORT', 'DISPUTE'], default: 'SUPPORT', index: true },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], default: 'OPEN', index: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', default: null, index: true },
    adminNote: { type: String, trim: true, default: '' },
    resolution: { type: String, trim: true, default: '' },
    assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin', default: null },
  },
  { timestamps: true }
);

supportTicketSchema.index({ status: 1, createdAt: -1 });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

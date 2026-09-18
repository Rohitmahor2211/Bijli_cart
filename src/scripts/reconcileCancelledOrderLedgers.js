import { connectDB, disconnectDB } from '../config/db.js';
import { Order } from '../models/order.model.js';
import { SellerLedger } from '../models/sellerLedger.model.js';

await connectDB();

try {
  const orders = await Order.find({
    isDeleted: false,
    $or: [
      { orderStatus: { $in: ['CANCELLED', 'RETURNED'] } },
      { refundStatus: { $in: ['PROCESSING', 'COMPLETED'] } },
    ],
  }).select('_id');

  const result = await SellerLedger.updateMany(
    {
      orderId: { $in: orders.map((order) => order._id) },
      entryType: 'COMMISSION',
      status: { $in: ['PENDING', 'AVAILABLE', 'RESERVED'] },
    },
    {
      $set: {
        status: 'VOID',
        'metadata.refundStatus': 'REQUESTED',
        'metadata.reconciledAt': new Date(),
      },
    },
  );

  console.log(`Cancelled-order ledger reconciliation complete. Voided ${result.modifiedCount} commission entries.`);
} finally {
  await disconnectDB();
}

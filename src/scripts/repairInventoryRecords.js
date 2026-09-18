import { connectDB, disconnectDB } from '../config/db.js';
import { Inventory } from '../models/inventory.model.js';
import { Product } from '../models/product.model.js';

await connectDB();

try {
  const products = await Product.find({ isDeleted: false }).select('_id retailerId inventory.stockQuantity inventory.lowStockThreshold').lean();
  let repaired = 0;

  for (const product of products) {
    const result = await Inventory.updateOne(
      { retailerId: product.retailerId, productId: product._id },
      {
        $setOnInsert: {
          retailerId: product.retailerId,
          productId: product._id,
          currentStock: Number(product.inventory?.stockQuantity || 0),
          reservedStock: 0,
          lowStockThreshold: Number(product.inventory?.lowStockThreshold || 5),
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount) repaired += 1;
  }

  console.log(`Inventory repair complete. Created ${repaired} missing inventory records.`);
} finally {
  await disconnectDB();
}

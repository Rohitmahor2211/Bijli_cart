import { Inventory, InventoryHistory } from '../models/inventory.model.js';
import { Product } from '../models/product.model.js';
import { Notification } from '../models/notification.model.js';
import { logger } from '../utils/logger.js';

export const updateStockQuantity = async ({
  retailerId,
  productId,
  changeQuantity,
  reason = '',
  type = 'ADJUSTMENT',
  createdBy = null,
  session = null,
}) => {
  const inventoryOptions = session ? { session } : {};

  const inventoryFilter = { retailerId, productId };
  let inventory = await Inventory.findOne(inventoryFilter, null, inventoryOptions);
  if (!inventory) {
    const product = await Product.findOne({ _id: productId, retailerId }, null, inventoryOptions);
    if (!product) {
      throw new Error('Product not found.');
    }
    inventory = new Inventory({
      retailerId,
      productId,
      currentStock: 0,
      reservedStock: 0,
      lowStockThreshold: product.inventory.lowStockThreshold || 5,
    });
  }

  const previousQuantity = inventory.currentStock;
  const newQuantity = previousQuantity + changeQuantity;

  if (newQuantity < 0) {
    const error = new Error(`Insufficient stock. Current stock is ${previousQuantity}, cannot reduce by ${Math.abs(changeQuantity)}.`);
    error.statusCode = 400;
    throw error;
  }

  inventory.currentStock = newQuantity;
  await inventory.save(inventoryOptions);

  // Log to InventoryHistory
  await InventoryHistory.create(
    [
      {
        retailerId,
        productId,
        previousQuantity,
        changeQuantity,
        newQuantity,
        reason,
        type,
        createdBy,
      },
    ],
    inventoryOptions
  );

  // Check low stock / out of stock triggers for notification
  const available = newQuantity - inventory.reservedStock;
  if (available === 0) {
    await Notification.create(
      [
        {
          retailerId,
          type: 'OUT_OF_STOCK',
          title: 'Product Out of Stock',
          message: `Product (ID: ${productId}) has run completely out of stock.`,
          metadata: { productId },
        },
      ],
      inventoryOptions
    );
  } else if (available <= inventory.lowStockThreshold) {
    await Notification.create(
      [
        {
          retailerId,
          type: 'LOW_STOCK',
          title: 'Low Stock Alert',
          message: `Product (ID: ${productId}) stock has fallen to ${available} items (Threshold: ${inventory.lowStockThreshold}).`,
          metadata: { productId },
        },
      ],
      inventoryOptions
    );
  }

  logger.info(`Stock updated for Product ${productId}: ${previousQuantity} -> ${newQuantity} (${type})`);

  return { inventory, previousQuantity, newQuantity, changeQuantity };
};

export const reserveStock = async ({ retailerId, productId, quantity, session = null }) => {
  const options = session ? { session } : {};
  const inventory = await Inventory.findOneAndUpdate(
    { retailerId, productId, $expr: { $gte: [{ $subtract: ['$currentStock', '$reservedStock'] }, quantity] } },
    { $inc: { reservedStock: quantity } },
    { ...options, new: true, returnDocument: 'after' },
  );
  if (!inventory) {
    const exists = await Inventory.exists({ retailerId, productId });
    const error = new Error(exists ? `Insufficient available stock for reservation. Requested: ${quantity}.` : 'Inventory record not found for product.');
    error.statusCode = 400;
    throw error;
  }
  return inventory;
};

export const releaseReservedStock = async ({ retailerId, productId, quantity, session = null }) => {
  const options = session ? { session } : {};
  const inventory = await Inventory.findOneAndUpdate(
    { retailerId, productId, reservedStock: { $gte: quantity } },
    { $inc: { reservedStock: -quantity } },
    { ...options, new: true, returnDocument: 'after' },
  );
  if (!inventory) {
    const error = new Error(`Reserved stock is lower than the requested release quantity: ${quantity}.`);
    error.statusCode = 400;
    throw error;
  }
  return inventory;
};

export const commitReservedStockToSale = async ({ retailerId, productId, quantity, session = null }) => {
  const options = session ? { session } : {};
  const inventory = await Inventory.findOneAndUpdate(
    { retailerId, productId, reservedStock: { $gte: quantity }, currentStock: { $gte: quantity } },
    { $inc: { reservedStock: -quantity, currentStock: -quantity } },
    { ...options, new: true, returnDocument: 'after' },
  );

  if (!inventory) {
    const error = new Error(`Unable to commit ${quantity} reserved units for product ${productId}.`);
    error.statusCode = 409;
    throw error;
  }

  const previousStock = inventory.currentStock + quantity;

  await InventoryHistory.create(
    [
      {
        retailerId,
        productId,
        previousQuantity: previousStock,
        changeQuantity: -quantity,
        newQuantity: inventory.currentStock,
        reason: 'Order Delivered - Stock Sale Executed',
        type: 'SALE',
      },
    ],
    options
  );
};

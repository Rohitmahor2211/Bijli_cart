import { Inventory, InventoryHistory } from '../models/inventory.model.js';
import { Product } from '../models/product.model.js';
import { updateStockQuantity } from '../services/inventory.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, formatPaginationMeta } from '../utils/pagination.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

export const addStockHandler = asyncWrapper(async (req, res) => {
  const { productId } = req.params;
  const { quantity, reason, type } = req.body;

  const result = await updateStockQuantity({
    retailerId: req.retailerId,
    productId,
    changeQuantity: Number(quantity),
    reason: reason || 'Stock Addition',
    type: type || 'PURCHASE',
    createdBy: req.retailerId,
  });

  return sendSuccess(res, 'Stock added successfully.', result);
});

export const reduceStockHandler = asyncWrapper(async (req, res) => {
  const { productId } = req.params;
  const { quantity, reason, type } = req.body;

  const result = await updateStockQuantity({
    retailerId: req.retailerId,
    productId,
    changeQuantity: -Number(quantity),
    reason: reason || 'Stock Reduction',
    type: type || 'DAMAGE',
    createdBy: req.retailerId,
  });

  return sendSuccess(res, 'Stock reduced successfully.', result);
});

export const adjustStockHandler = asyncWrapper(async (req, res) => {
  const { productId } = req.params;
  const { newQuantity, reason } = req.body;

  const inventory = await Inventory.findOne({ retailerId: req.retailerId, productId });
  const current = inventory ? inventory.currentStock : 0;
  const change = Number(newQuantity) - current;

  const result = await updateStockQuantity({
    retailerId: req.retailerId,
    productId,
    changeQuantity: change,
    reason: reason || 'Manual Stock Adjustment',
    type: 'ADJUSTMENT',
    createdBy: req.retailerId,
  });

  return sendSuccess(res, 'Stock adjusted successfully.', result);
});

export const getInventoryList = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);

  const [inventories, total] = await Promise.all([
    Inventory.find({ retailerId: req.retailerId })
      .populate({
        path: 'productId',
        select: 'name sku brand category pricing images status isDeleted',
        populate: { path: 'category', select: 'name' },
      })
      .skip(skip)
      .limit(limit),
    Inventory.countDocuments({ retailerId: req.retailerId }),
  ]);

  // Filter out records whose products have been soft deleted
  const filtered = inventories.filter((inv) => inv.productId && !inv.productId.isDeleted);

  const paginationMeta = formatPaginationMeta(total, page, limit);

  return sendSuccess(res, 'Inventory list fetched.', { inventory: filtered }, 200, paginationMeta);
});

export const getInventoryHistoryHandler = asyncWrapper(async (req, res) => {
  const { productId } = req.params;
  const { page, limit, skip } = getPaginationParams(req.query);

  const filter = { retailerId: req.retailerId, productId };

  const [history, total] = await Promise.all([
    InventoryHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InventoryHistory.countDocuments(filter),
  ]);

  const paginationMeta = formatPaginationMeta(total, page, limit);

  return sendSuccess(res, 'Inventory history fetched.', { history }, 200, paginationMeta);
});

export const getLowStockProducts = asyncWrapper(async (req, res) => {
  const inventories = await Inventory.find({ retailerId: req.retailerId }).populate({
    path: 'productId',
    select: 'name sku brand pricing images status isDeleted',
  });

  const lowStockItems = inventories.filter((inv) => {
    if (!inv.productId || inv.productId.isDeleted) return false;
    const available = inv.currentStock - inv.reservedStock;
    return available > 0 && available <= inv.lowStockThreshold;
  });

  return sendSuccess(res, 'Low stock items fetched.', {
    count: lowStockItems.length,
    items: lowStockItems,
  });
});

export const getOutOfStockProducts = asyncWrapper(async (req, res) => {
  const inventories = await Inventory.find({ retailerId: req.retailerId }).populate({
    path: 'productId',
    select: 'name sku brand pricing images status isDeleted',
  });

  const outOfStockItems = inventories.filter((inv) => {
    if (!inv.productId || inv.productId.isDeleted) return false;
    const available = inv.currentStock - inv.reservedStock;
    return available <= 0;
  });

  return sendSuccess(res, 'Out of stock items fetched.', {
    count: outOfStockItems.length,
    items: outOfStockItems,
  });
});

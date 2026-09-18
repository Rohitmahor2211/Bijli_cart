import mongoose from 'mongoose';
import { Order } from '../models/order.model.js';
import { Product } from '../models/product.model.js';
import { Category } from '../models/category.model.js';
import { Inventory } from '../models/inventory.model.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { SellerLedger } from '../models/sellerLedger.model.js';

export const getSalesReport = asyncWrapper(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const retailerId = req.retailerId;

  const matchStage = {
    retailerId,
    isDeleted: false,
    orderStatus: { $ne: 'CANCELLED' },
  };

  if (dateFrom || dateTo) {
    matchStage.createdAt = {};
    if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
    if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
  }

  const [report, ledgerReport] = await Promise.all([Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: 0 },
        totalSubtotal: { $sum: '$subtotal' },
        totalTax: { $sum: '$tax' },
        totalShipping: { $sum: '$shipping' },
        totalDiscounts: { $sum: '$discount' },
        averageOrderValue: { $avg: 0 },
      },
    },
  ]), SellerLedger.aggregate([
    { $match: { retailerId, entryType: { $in: ['SALE', 'COMMISSION'] }, status: { $ne: 'VOID' }, ...(matchStage.createdAt ? { createdAt: matchStage.createdAt } : {}) } },
    { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
  ])]);

  const summary = report[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    totalSubtotal: 0,
    totalTax: 0,
    totalShipping: 0,
    totalDiscounts: 0,
    averageOrderValue: 0,
  };
  summary.totalRevenue = Number((ledgerReport[0]?.totalRevenue || 0).toFixed(2));
  summary.averageOrderValue = summary.totalOrders ? Number((summary.totalRevenue / summary.totalOrders).toFixed(2)) : 0;

  return sendSuccess(res, 'Sales report generated.', { summary });
});

export const getProductReport = asyncWrapper(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const retailerId = req.retailerId;

  const matchStage = {
    retailerId,
    isDeleted: false,
    orderStatus: { $nin: ['CANCELLED', 'RETURNED'] },
  };

  if (dateFrom || dateTo) {
    matchStage.createdAt = {};
    if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
    if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
  }

  const productsReport = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        sku: { $first: '$items.sku' },
        unitsSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  return sendSuccess(res, 'Product performance report generated.', { products: productsReport });
});

export const getCategoryReport = asyncWrapper(async (req, res) => {
  const retailerId = req.retailerId;

  const categoryReport = await Order.aggregate([
    {
      $match: {
        retailerId,
        isDeleted: false,
        orderStatus: { $nin: ['CANCELLED', 'RETURNED'] },
      },
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'productDetails',
      },
    },
    { $unwind: '$productDetails' },
    {
      $lookup: {
        from: 'categories',
        localField: 'productDetails.category',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    { $unwind: '$categoryDetails' },
    {
      $group: {
        _id: '$categoryDetails._id',
        categoryName: { $first: '$categoryDetails.name' },
        totalUnitsSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  return sendSuccess(res, 'Category breakdown report generated.', { categories: categoryReport });
});

export const getProfitReport = asyncWrapper(async (req, res) => {
  const retailerId = req.retailerId;

  const profitReport = await Order.aggregate([
    {
      $match: {
        retailerId,
        isDeleted: false,
        orderStatus: { $nin: ['CANCELLED', 'RETURNED'] },
      },
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $project: {
        itemSubtotal: '$items.subtotal',
        quantity: '$items.quantity',
        purchaseCost: { $multiply: ['$items.quantity', { $ifNull: ['$product.pricing.purchasePrice', 0] }] },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$itemSubtotal' },
        totalPurchaseCost: { $sum: '$purchaseCost' },
      },
    },
    {
      $project: {
        _id: 0,
        totalRevenue: 1,
        totalPurchaseCost: 1,
        grossProfit: { $subtract: ['$totalRevenue', '$totalPurchaseCost'] },
        marginPercentage: {
          $cond: [
            { $eq: ['$totalRevenue', 0] },
            0,
            {
              $multiply: [
                { $divide: [{ $subtract: ['$totalRevenue', '$totalPurchaseCost'] }, '$totalRevenue'] },
                100,
              ],
            },
          ],
        },
      },
    },
  ]);

  const summary = profitReport[0] || {
    totalRevenue: 0,
    totalPurchaseCost: 0,
    grossProfit: 0,
    marginPercentage: 0,
  };

  return sendSuccess(res, 'Profit report generated.', { summary });
});

export const getInventoryReport = asyncWrapper(async (req, res) => {
  const retailerId = req.retailerId;

  const valuationReport = await Inventory.aggregate([
    { $match: { retailerId } },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    { $match: { 'product.isDeleted': false } },
    {
      $project: {
        currentStock: 1,
        sellingValuation: { $multiply: ['$currentStock', '$product.pricing.sellingPrice'] },
        costValuation: { $multiply: ['$currentStock', { $ifNull: ['$product.pricing.purchasePrice', 0] }] },
      },
    },
    {
      $group: {
        _id: null,
        totalItemsInStock: { $sum: '$currentStock' },
        totalSellingValue: { $sum: '$sellingValuation' },
        totalCostValue: { $sum: '$costValuation' },
      },
    },
  ]);

  const summary = valuationReport[0] || {
    totalItemsInStock: 0,
    totalSellingValue: 0,
    totalCostValue: 0,
  };

  return sendSuccess(res, 'Inventory valuation report generated.', { summary });
});

export const getCustomerReport = asyncWrapper(async (req, res) => {
  const retailerId = req.retailerId;

  const customerReport = await Order.aggregate([
    {
      $match: {
        retailerId,
        isDeleted: false,
        orderStatus: { $ne: 'CANCELLED' },
      },
    },
    {
      $group: {
        _id: '$customerId',
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$grandTotal' },
        lastOrderDate: { $max: '$createdAt' },
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customerDetails',
      },
    },
    { $unwind: '$customerDetails' },
    {
      $project: {
        _id: 1,
        name: '$customerDetails.name',
        phone: '$customerDetails.phone',
        email: '$customerDetails.email',
        totalOrders: 1,
        totalSpent: 1,
        lastOrderDate: 1,
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 20 },
  ]);

  return sendSuccess(res, 'Customer analytics report generated.', { customers: customerReport });
});

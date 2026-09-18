import mongoose from 'mongoose';
import { Order } from '../models/order.model.js';
import { Product } from '../models/product.model.js';
import { Customer } from '../models/customer.model.js';
import { Inventory } from '../models/inventory.model.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { SellerLedger } from '../models/sellerLedger.model.js';

export const getDashboardOverview = asyncWrapper(async (req, res) => {
  const retailerId = req.retailerId;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Totals (Products, Customers, Orders, Pending Orders)
  const [totalProducts, totalCustomers, totalOrders, pendingOrders] = await Promise.all([
    Product.countDocuments({ retailerId, isDeleted: false }),
    Customer.countDocuments({ retailerId, isDeleted: false }),
    Order.countDocuments({ retailerId, isDeleted: false }),
    Order.countDocuments({ retailerId, isDeleted: false, orderStatus: 'PENDING' }),
  ]);

  // 2. Sales Totals (Today & Monthly)
  const salesAggregation = await SellerLedger.aggregate([
    {
      $match: {
        retailerId,
        entryType: { $in: ['SALE', 'COMMISSION'] },
        status: { $ne: 'VOID' },
      },
    },
    {
      $facet: {
        todaySales: [
          { $match: { createdAt: { $gte: startOfToday } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ],
        monthlySales: [
          { $match: { createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ],
      },
    },
  ]);

  const todaySales = salesAggregation[0]?.todaySales[0]?.total || 0;
  const monthlySales = salesAggregation[0]?.monthlySales[0]?.total || 0;

  // 3. Stock Level Counts (Low stock & Out of stock)
  const inventories = await Inventory.find({ retailerId }).populate({
    path: 'productId',
    select: 'isDeleted',
  });

  let lowStockProducts = 0;
  let outOfStockProducts = 0;

  inventories.forEach((inv) => {
    if (inv.productId && !inv.productId.isDeleted) {
      const available = inv.currentStock - inv.reservedStock;
      if (available <= 0) {
        outOfStockProducts++;
      } else if (available <= inv.lowStockThreshold) {
        lowStockProducts++;
      }
    }
  });

  // 4. Recent Orders (Last 5)
  const recentOrders = await Order.find({ retailerId, isDeleted: false })
    .populate('customerId', 'name phone')
    .sort({ createdAt: -1 })
    .limit(5);

  // 5. Order Status Distribution Overview
  const orderStatusDistribution = await Order.aggregate([
    { $match: { retailerId, isDeleted: false } },
    { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
  ]);

  const orderStatusOverview = {};
  orderStatusDistribution.forEach((item) => {
    orderStatusOverview[item._id] = item.count;
  });

  // 6. Top Selling Products
  const topSellingProducts = await Order.aggregate([
    {
      $match: {
        retailerId,
        isDeleted: false,
        orderStatus: { $nin: ['CANCELLED', 'RETURNED'] },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        sku: { $first: '$items.sku' },
        totalQuantitySold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: 5 },
  ]);

  // 7. Monthly Sales Trend (Last 6 Months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const salesTrend = await SellerLedger.aggregate([
    {
      $match: {
        retailerId,
        entryType: { $in: ['SALE', 'COMMISSION'] },
        status: { $ne: 'VOID' },
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalSales: { $sum: '$amount' },
        orderIds: { $addToSet: '$orderId' },
      },
    },
    { $addFields: { totalOrders: { $size: '$orderIds' } } },
    { $project: { _id: 1, totalSales: 1, totalOrders: 1 } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return sendSuccess(res, 'Dashboard overview metrics fetched.', {
    overview: {
      todaySales,
      monthlySales,
      totalProducts,
      totalOrders,
      totalCustomers,
      lowStockProducts,
      outOfStockProducts,
      pendingOrders,
    },
    recentOrders,
    orderStatusOverview,
    topSellingProducts,
    salesTrend,
  });
});

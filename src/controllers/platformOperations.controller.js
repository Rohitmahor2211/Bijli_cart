import { PlatformAdmin } from "../models/platformAdmin.model.js";
import { Retailer } from "../models/retailer.model.js";
import { Buyer } from "../models/buyer.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { Payment } from "../models/payment.model.js";
import { PayoutRequest } from "../models/payoutRequest.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { SupportTicket } from "../models/supportTicket.model.js";
import { MerchandisingBanner } from "../models/merchandisingBanner.model.js";
import { FeaturedBrand } from "../models/featuredBrand.model.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import {
  formatPaginationMeta,
  getPaginationParams,
} from "../utils/pagination.js";
import { SellerLedger } from "../models/sellerLedger.model.js";
import { env } from "../config/env.js";
import { notifySeller, notifyBuyer } from "../services/notification.service.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const audit = async (req, action, entityType, entityId, metadata = {}) => {
  await AuditLog.create({
    actorType: "PLATFORM_ADMIN",
    actorId: req.platformAdmin._id,
    action,
    entityType,
    entityId,
    metadata,
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });
};
export const getPlatformAdminMe = asyncWrapper(async (req, res) => {
  return sendSuccess(res, "Platform administrator profile fetched.", {
    admin: req.platformAdmin.toJSON(),
  });
});

export const getOperationsOverview = asyncWrapper(async (req, res) => {
  const [
    pendingSellers,
    pendingProducts,
    orders,
    paidOrders,
    openTickets,
    payoutsProcessing,
    returnRequests,
    buyers,
  ] = await Promise.all([
    Retailer.countDocuments({ sellerStatus: "PENDING" }),
    Product.countDocuments({ isDeleted: false, status: "PENDING_REVIEW" }),
    Order.countDocuments({ isDeleted: false }),
    Order.aggregate([
      { $match: { isDeleted: false, paymentStatus: "PAID" } },
      {
        $group: { _id: null, gmv: { $sum: "$grandTotal" }, count: { $sum: 1 } },
      },
    ]),
    SupportTicket.countDocuments({ status: { $in: ["OPEN", "IN_PROGRESS"] } }),
    PayoutRequest.countDocuments({ status: "PROCESSING" }),
    Order.countDocuments({
      isDeleted: false,
      "returnRequest.status": { $nin: ["NONE"] },
    }),
    Buyer.countDocuments({}),
  ]);

  return sendSuccess(res, "Operations overview fetched.", {
    pendingSellers,
    pendingProducts,
    orders,
    paidOrderCount: paidOrders[0]?.count || 0,
    paidGmv: paidOrders[0]?.gmv || 0,
    openTickets,
    payoutsProcessing,
    returnRequests,
    buyers,
  });
});

const paginated = async (model, filter, req, populate = []) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  let query = model
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  for (const item of populate) query = query.populate(item);
  const [records, total] = await Promise.all([
    query,
    model.countDocuments(filter),
  ]);
  return { records, meta: formatPaginationMeta(total, page, limit) };
};

export const listPlatformOrders = asyncWrapper(async (req, res) => {
  const filter = { isDeleted: false };
  if (req.query.status) filter.orderStatus = req.query.status;
  if (req.query.search)
    filter.orderNumber = new RegExp(
      req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
  const { records, meta } = await paginated(Order, filter, req, [
    { path: "retailerId", select: "shopName email sellerStatus" },
    { path: "buyerId", select: "name phone city" },
    {
      path: "items.productId",
      select: "name globalCategoryId",
      populate: { path: "globalCategoryId", select: "name" },
    },
  ]);
  const commissionEntries = await SellerLedger.find({
    orderId: { $in: records.map((order) => order._id) },
    entryType: "COMMISSION",
    status: { $ne: "VOID" },
  })
    .select("orderId amount")
    .lean();
  const commissionByOrder = new Map(
    commissionEntries.map((entry) => [
      String(entry.orderId),
      Math.abs(Number(entry.amount || 0)),
    ]),
  );
  const orders = records.map((order) => {
    const commission =
      commissionByOrder.get(String(order._id)) ??
      Number(
        ((order.subtotal * env.PLATFORM_COMMISSION_PERCENT) / 100).toFixed(2),
      );
    return {
      ...order.toObject(),
      productCategories: [
        ...new Set(
          order.items
            .map((item) => item.productId?.globalCategoryId?.name)
            .filter(Boolean),
        ),
      ],
      sellerPayableAmount: Number((order.grandTotal - commission).toFixed(2)),
      sellerPaidAmount:
        order.sellerPaymentStatus === "COMPLETED"
          ? Number(order.sellerPayment?.amount || 0)
          : 0,
    };
  });
  return sendSuccess(res, "Orders fetched.", { orders }, 200, meta);
});

const analyticsPeriod = (value) =>
  ["daily", "weekly", "monthly", "quarterly", "half-yearly", "yearly"].includes(
    value,
  )
    ? value
    : "monthly";

const getAnalyticsRange = (period) => {
  const end = new Date();
  const start = new Date(end);
  const days = {
    daily: 30,
    weekly: 84,
    monthly: 365,
    quarterly: 730,
    "half-yearly": 1095,
    yearly: 1825,
  };
  start.setDate(start.getDate() - days[period]);
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

const getBucketKey = (date, period) => {
  const value = new Date(date);
  const year = value.getFullYear();
  if (period === "daily") return value.toISOString().slice(0, 10);
  if (period === "weekly") {
    const firstDay = new Date(year, 0, 1);
    const week = Math.ceil(
      ((value - firstDay) / 86400000 + firstDay.getDay() + 1) / 7,
    );
    return `${year}-W${String(week).padStart(2, "0")}`;
  }
  if (period === "monthly")
    return `${year}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  if (period === "quarterly")
    return `${year}-Q${Math.floor(value.getMonth() / 3) + 1}`;
  if (period === "half-yearly")
    return `${year}-H${value.getMonth() < 6 ? 1 : 2}`;
  return String(year);
};

export const getPlatformAnalytics = asyncWrapper(async (req, res) => {
  const period = analyticsPeriod(req.query.period);
  const { start, end } = getAnalyticsRange(period);
  const orderFilter = {
    isDeleted: false,
    createdAt: { $gte: start, $lte: end },
  };
  if (req.query.sellerId) orderFilter.retailerId = req.query.sellerId;
  const commissionFilter = {
    entryType: "COMMISSION",
    status: { $ne: "VOID" },
    createdAt: { $gte: start, $lte: end },
  };
  if (req.query.sellerId) commissionFilter.retailerId = req.query.sellerId;

  const [orders, commissions] = await Promise.all([
    Order.find(orderFilter)
      .select("orderNumber retailerId buyerId items orderStatus grandTotal subtotal createdAt")
      .populate("retailerId", "shopName")
      .populate("buyerId", "name")
      .populate({ path: "items.productId", select: "name globalCategoryId", populate: { path: "globalCategoryId", select: "name" } })
      .lean(),
    SellerLedger.find(commissionFilter).select("amount createdAt orderId retailerId").lean(),
  ]);

  const sellerMap = new Map();
  const chartMap = new Map();
  const addBucket = (key) => {
    if (!chartMap.has(key))
      chartMap.set(key, { label: key, orders: 0, commission: 0 });
    return chartMap.get(key);
  };

  for (const order of orders) {
    const sellerId = String(
      order.retailerId?._id || order.retailerId || "unknown",
    );
    if (!sellerMap.has(sellerId)) {
      sellerMap.set(sellerId, {
        sellerId,
        sellerName: order.retailerId?.shopName || "Unknown seller",
        total: 0,
        pending: 0,
        accepted: 0,
        delivered: 0,
        cancelled: 0,
      });
    }
    const seller = sellerMap.get(sellerId);
    seller.total += 1;
    const status = String(order.orderStatus || "").toLowerCase();
    if (status === "pending" || status === "confirmed") seller.pending += 1;
    else if (status === "accepted") seller.accepted += 1;
    else if (status === "delivered") seller.delivered += 1;
    else if (status === "cancelled" || status === "canceled")
      seller.cancelled += 1;
    addBucket(getBucketKey(order.createdAt, period)).orders += 1;
  }

  let totalCommission = 0;
  for (const entry of commissions) {
    const amount = Math.abs(Number(entry.amount || 0));
    totalCommission += amount;
    addBucket(getBucketKey(entry.createdAt, period)).commission += amount;
  }

  const activeOrders = orders.filter((order) => order.orderStatus !== "CANCELLED");
  const gmv = activeOrders.reduce((total, order) => total + Number(order.grandTotal || 0), 0);
  const categoryMap = new Map();
  for (const order of activeOrders) {
    for (const item of order.items || []) {
      const category = item.productId?.globalCategoryId?.name || "Uncategorized";
      const current = categoryMap.get(category) || { name: category, orders: 0, units: 0, sales: 0 };
      current.orders += 1;
      current.units += Number(item.quantity || 0);
      current.sales += Number(item.subtotal || 0);
      categoryMap.set(category, current);
    }
  }
  const sellerCommissionMap = new Map();
  for (const entry of commissions) {
    const sellerId = String(entry.retailerId);
    sellerCommissionMap.set(sellerId, (sellerCommissionMap.get(sellerId) || 0) + Math.abs(Number(entry.amount || 0)));
  }
  const topSellers = [...sellerMap.values()].map((seller) => {
    const sales = orders.filter((order) => String(order.retailerId?._id || order.retailerId) === seller.sellerId && order.orderStatus !== "CANCELLED").reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
    const commission = Number((sellerCommissionMap.get(seller.sellerId) || 0).toFixed(2));
    return { ...seller, sales: Number(sales.toFixed(2)), commission, performance: seller.cancelled === 0 && seller.delivered > 0 ? "Excellent" : seller.delivered > 0 ? "Stable" : "Needs attention" };
  }).sort((left, right) => right.commission - left.commission);

  const statusTotals = orders.reduce(
    (totals, order) => {
      const status = String(order.orderStatus || "").toLowerCase();
      if (status === "pending" || status === "confirmed") totals.pending += 1;
      else if (status === "accepted") totals.accepted += 1;
      else if (status === "delivered") totals.delivered += 1;
      else if (status === "cancelled" || status === "canceled")
        totals.cancelled += 1;
      return totals;
    },
    { pending: 0, accepted: 0, delivered: 0, cancelled: 0 },
  );

  const productMap = new Map();
  for (const order of orders) {
    for (const item of order.items || []) {
      const key = String(
        item.productId?._id || item.productId || item.productName,
      );
      const current = productMap.get(key) || {
        productId: key,
        productName: item.productId?.name || item.productName,
        category: item.productId?.globalCategoryId?.name || "Uncategorized",
        units: 0,
        revenue: 0,
      };
      current.units += Number(item.quantity || 0);
      current.revenue += Number(item.subtotal || 0);
      productMap.set(key, current);
    }
  }

  return sendSuccess(res, "Platform analytics fetched.", {
    period,
    range: { start, end },
    summary: {
      totalOrders: orders.length,
      ...statusTotals,
      totalCommission: Number(totalCommission.toFixed(2)),
      commissionTransactions: commissions.length,
    },
    sellers: [...sellerMap.values()].sort(
      (left, right) => right.total - left.total,
    ),
    topSellers,
    categories: [...categoryMap.values()].sort((left, right) => right.sales - left.sales),
    recentOrders: [...orders].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)).slice(0, 8),
    marketplace: {
      gmv: Number(gmv.toFixed(2)),
      sellerPayout: Number((gmv - totalCommission).toFixed(2)),
      averageOrderValue: activeOrders.length ? Number((gmv / activeOrders.length).toFixed(2)) : 0,
      cancellationRate: orders.length ? Number(((statusTotals.cancelled / orders.length) * 100).toFixed(2)) : 0,
    },
    products: [...productMap.values()].sort(
      (left, right) => right.revenue - left.revenue,
    ),
    series: [...chartMap.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
  });
});

export const confirmSellerPayment = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, isDeleted: false });
  if (!order) return sendError(res, "Order not found.", null, 404);
  if (order.orderStatus !== "DELIVERED")
    return sendError(
      res,
      "Seller payment is allowed only after delivery.",
      null,
      400,
    );
  if (order.paymentStatus !== "PAID")
    return sendError(res, "Buyer payment is not completed.", null, 400);
  if (order.refundStatus !== "NOT_REQUIRED")
    return sendError(
      res,
      "Refunded or refunding orders cannot be paid to the seller.",
      null,
      400,
    );
  if (order.sellerPaymentStatus === "COMPLETED")
    return sendError(res, "Seller payment is already completed.", null, 409);

  const commissionEntry = await SellerLedger.findOne({
    orderId: order._id,
    entryType: "COMMISSION",
    status: { $ne: "VOID" },
  }).select("amount");
  const commission = commissionEntry
    ? Math.abs(Number(commissionEntry.amount))
    : Number(
        ((order.subtotal * env.PLATFORM_COMMISSION_PERCENT) / 100).toFixed(2),
      );
  const expectedAmount = Number((order.grandTotal - commission).toFixed(2));
  if (Number(req.body.amount) !== expectedAmount) {
    return sendError(
      res,
      `Seller payment must be ₹${expectedAmount.toLocaleString("en-IN")}.`,
      null,
      400,
    );
  }

  const paidAt = req.body.paidAt ? new Date(req.body.paidAt) : new Date();
  order.sellerPaymentStatus = "COMPLETED";
  order.sellerPayment = {
    amount: expectedAmount,
    method: req.body.method,
    reference: req.body.reference,
    paidAt,
    paidByAdminId: req.platformAdmin._id,
    notes: req.body.notes || "",
  };
  await SellerLedger.updateMany(
    {
      orderId: order._id,
      retailerId: order.retailerId,
      entryType: { $in: ["SALE", "COMMISSION"] },
      status: { $in: ["PENDING", "AVAILABLE"] },
    },
    {
      $set: {
        status: "PAID",
        "metadata.manualPaymentAmount": expectedAmount,
        "metadata.manualPaymentMethod": req.body.method,
        "metadata.manualPaymentReference": req.body.reference,
      },
    },
  );
  order.timeline.push({
    status: "SELLER_PAYMENT_COMPLETED",
    comment: `Seller paid ${req.body.method} with reference ${req.body.reference}.`,
    timestamp: paidAt,
  });

  await order.save();
  await audit(req, "SELLER_PAYMENT_COMPLETED", "Order", order._id, {
    amount: expectedAmount,
    method: req.body.method,
    reference: req.body.reference,
  });
  await notifySeller({
    retailerId: order.retailerId,
    type: "SELLER_PAYMENT_COMPLETED",
    title: "Seller payment completed",
    message: `₹${expectedAmount.toLocaleString("en-IN")} was paid for order ${order.orderNumber} by ${req.body.method}. Reference: ${req.body.reference}.`,
    metadata: {
      orderId: order._id,
      amount: expectedAmount,
      method: req.body.method,
      reference: req.body.reference,
    },
  });
  return sendSuccess(res, "Seller payment confirmed.", { order });
});

export const markPlatformOrderDelivered = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, isDeleted: false });
  if (!order) return sendError(res, "Order not found.", null, 404);
  if (order.orderStatus !== "ACCEPTED")
    return sendError(
      res,
      "Only accepted orders can be marked delivered.",
      null,
      400,
    );
  order.orderStatus = "DELIVERED";
  order.deliveredAt = new Date();
  order.deliveredBy = req.platformAdmin._id;
  order.sellerPaymentStatus = "PENDING";
  order.timeline.push({
    status: "DELIVERED",
    comment: "Delivery confirmed by platform admin.",
  });
  await order.save();
  await audit(req, "ORDER_DELIVERED", "Order", order._id);
  await notifyBuyer({
    buyerId: order.buyerId,
    type: "ORDER_DELIVERED",
    title: "Order delivered",
    message: `Order ${order.orderNumber} was delivered.`,
    metadata: { orderId: order._id },
  });
  return sendSuccess(res, "Order marked delivered.", { order });
});

export const listPlatformBuyers = asyncWrapper(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    const searchRegex = new RegExp(
      req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { name: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
      { city: searchRegex },
    ];
  }
  const { records, meta } = await paginated(Buyer, filter, req);
  return sendSuccess(res, "Buyers fetched.", { buyers: records }, 200, meta);
});

export const listPlatformPayouts = asyncWrapper(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const { records, meta } = await paginated(PayoutRequest, filter, req, [
    { path: "retailerId", select: "shopName email sellerStatus" },
  ]);
  return sendSuccess(res, "Payouts fetched.", { payouts: records }, 200, meta);
});

export const listPlatformRefunds = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = { refunds: { $exists: true, $not: { $size: 0 } } };
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("buyerId", "name phone")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);
  return sendSuccess(
    res,
    "Refunds fetched.",
    { payments },
    200,
    formatPaginationMeta(total, page, limit),
  );
});

export const listPlatformCommissions = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = { entryType: "COMMISSION" };
  const [entries, total, totals] = await Promise.all([
    SellerLedger.find(filter)
      .populate("retailerId", "shopName email")
      .populate("orderId", "orderNumber grandTotal")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SellerLedger.countDocuments(filter),
    SellerLedger.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: { $multiply: ["$amount", -1] } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);
  return sendSuccess(
    res,
    "Platform commission report fetched.",
    {
      commissions: entries,
      totalCommission: totals[0]?.totalCommission || 0,
      transactionCount: totals[0]?.count || 0,
    },
    200,
    formatPaginationMeta(total, page, limit),
  );
});

export const listPlatformReturns = asyncWrapper(async (req, res) => {
  const filter = {
    isDeleted: false,
    "returnRequest.status": { $nin: ["NONE"] },
  };
  if (req.query.status) filter["returnRequest.status"] = req.query.status;
  const { records, meta } = await paginated(Order, filter, req, [
    { path: "retailerId", select: "shopName email" },
    { path: "buyerId", select: "name phone" },
  ]);
  return sendSuccess(
    res,
    "Return requests fetched.",
    { orders: records },
    200,
    meta,
  );
});

export const listAuditLogs = asyncWrapper(async (req, res) => {
  const filter = {};
  if (req.query.action)
    filter.action = new RegExp(
      req.query.action.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
  if (req.query.actorType) filter.actorType = req.query.actorType;
  const { records, meta } = await paginated(AuditLog, filter, req);
  return sendSuccess(res, "Audit logs fetched.", { logs: records }, 200, meta);
});

export const listPlatformTickets = asyncWrapper(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  const { records, meta } = await paginated(SupportTicket, filter, req, [
    { path: "buyerId", select: "name phone email" },
    { path: "orderId", select: "orderNumber orderStatus grandTotal" },
    { path: "retailerId", select: "shopName" },
  ]);
  return sendSuccess(
    res,
    "Support tickets fetched.",
    { tickets: records },
    200,
    meta,
  );
});

export const updatePlatformTicket = asyncWrapper(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return sendError(res, "Support ticket not found.", null, 404);
  const previousStatus = ticket.status;
  if (req.body.status) ticket.status = req.body.status;
  if (req.body.adminNote !== undefined) ticket.adminNote = req.body.adminNote;
  if (req.body.resolution !== undefined)
    ticket.resolution = req.body.resolution;
  ticket.assignedAdminId = req.platformAdmin._id;
  await ticket.save();
  await audit(req, "SUPPORT_TICKET_UPDATED", "SupportTicket", ticket._id, {
    previousStatus,
    status: ticket.status,
  });
  return sendSuccess(res, "Support ticket updated.", { ticket });
});

export const listStaff = asyncWrapper(async (req, res) => {
  const staff = await PlatformAdmin.find({}).sort({ createdAt: 1 });
  return sendSuccess(res, "Staff accounts fetched.", {
    staff: staff.map((item) => item.toJSON()),
  });
});

export const createStaff = asyncWrapper(async (req, res) => {
  const phone = req.body.phone.trim();
  if (await PlatformAdmin.exists({ phone }))
    return sendError(
      res,
      "A staff account with this phone number already exists.",
      null,
      409,
    );
  const staff = await PlatformAdmin.create({
    name: req.body.name.trim(),
    phone,
    role: req.body.role,
    isActive: true,
  });
  await audit(req, "STAFF_CREATED", "PlatformAdmin", staff._id, {
    phone: staff.phone,
    role: staff.role,
  });
  return sendSuccess(
    res,
    "Staff account created.",
    { staff: staff.toJSON() },
    201,
  );
});

export const updateStaff = asyncWrapper(async (req, res) => {
  const staff = await PlatformAdmin.findById(req.params.id);
  if (!staff) return sendError(res, "Staff account not found.", null, 404);
  if (
    String(staff._id) === String(req.platformAdmin._id) &&
    req.body.isActive === false
  ) {
    return sendError(
      res,
      "You cannot deactivate your own platform administrator account.",
      null,
      400,
    );
  }
  if (req.body.role) staff.role = req.body.role;
  if (req.body.isActive !== undefined) staff.isActive = req.body.isActive;
  await staff.save();
  await audit(req, "STAFF_UPDATED", "PlatformAdmin", staff._id, {
    role: staff.role,
    isActive: staff.isActive,
  });
  return sendSuccess(res, "Staff account updated.", { staff: staff.toJSON() });
});

export const listBanners = asyncWrapper(async (req, res) => {
  const banners = await MerchandisingBanner.find({}).sort({
    position: 1,
    createdAt: -1,
  });
  return sendSuccess(res, "Banners fetched.", { banners });
});

export const createBanner = asyncWrapper(async (req, res) => {
  const banner = await MerchandisingBanner.create({
    ...req.body,
    createdByAdminId: req.platformAdmin._id,
  });
  await audit(req, "BANNER_CREATED", "MerchandisingBanner", banner._id, {
    title: banner.title,
  });
  return sendSuccess(res, "Banner created.", { banner }, 201);
});

export const updateBanner = asyncWrapper(async (req, res) => {
  const banner = await MerchandisingBanner.findById(req.params.id);
  if (!banner) return sendError(res, "Banner not found.", null, 404);
  Object.assign(banner, req.body);
  await banner.save();
  await audit(req, "BANNER_UPDATED", "MerchandisingBanner", banner._id, {
    isActive: banner.isActive,
  });
  return sendSuccess(res, "Banner updated.", { banner });
});

export const listFeaturedBrandsAdmin = asyncWrapper(async (req, res) => {
  const brands = await FeaturedBrand.find({}).sort({ position: 1, name: 1 });
  return sendSuccess(res, "Featured brands fetched.", { brands });
});

export const createFeaturedBrand = asyncWrapper(async (req, res) => {
  const slug = slugify(req.body.name);
  if (!slug)
    return sendError(res, "A valid brand name is required.", null, 400);
  if (await FeaturedBrand.exists({ slug }))
    return sendError(res, "This brand is already featured.", null, 409);
  const brand = await FeaturedBrand.create({
    name: req.body.name.trim(),
    slug,
    position: req.body.position || 1,
    isActive: req.body.isActive !== false,
    createdByAdminId: req.platformAdmin._id,
  });
  await audit(req, "FEATURED_BRAND_CREATED", "FeaturedBrand", brand._id, {
    slug,
  });
  return sendSuccess(res, "Featured brand created.", { brand }, 201);
});

export const updateFeaturedBrand = asyncWrapper(async (req, res) => {
  const brand = await FeaturedBrand.findById(req.params.id);
  if (!brand) return sendError(res, "Featured brand not found.", null, 404);
  if (req.body.name) {
    brand.name = req.body.name.trim();
    brand.slug = slugify(req.body.name);
  }
  if (req.body.position !== undefined) brand.position = req.body.position;
  if (req.body.isActive !== undefined) brand.isActive = req.body.isActive;
  await brand.save();
  await audit(req, "FEATURED_BRAND_UPDATED", "FeaturedBrand", brand._id, {
    isActive: brand.isActive,
  });
  return sendSuccess(res, "Featured brand updated.", { brand });
});

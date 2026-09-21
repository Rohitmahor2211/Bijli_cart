import { BuyerNotification } from "../models/buyerNotification.model.js";
import { Notification } from "../models/notification.model.js";
import { Buyer } from "../models/buyer.model.js";
import { Retailer } from "../models/retailer.model.js";
import { PlatformAdmin } from "../models/platformAdmin.model.js";
import { PlatformAdminNotification } from "../models/platformAdminNotification.model.js";
import { sendSMS } from "./sms/sms.service.js";
import { logger } from "../utils/logger.js";

export const getOrderNotificationDetails = async (order) => {
  const retailer = await Retailer.findById(order.retailerId).select(
    "shopName ownerName",
  );
  const products = (order.items || []).map((item) => ({
    name: item.productName,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal,
  }));
  const productSummary = products
    .map(
      (item) =>
        `${item.name} x${item.quantity} (₹${item.subtotal.toLocaleString("en-IN")})`,
    )
    .join(", ");
  return {
    orderNumber: order.orderNumber,
    shopName: retailer?.shopName || "Unknown shop",
    sellerName: retailer?.ownerName || "Unknown seller",
    products,
    productSummary,
    orderTotal: order.grandTotal,
  };
};

const sendNotificationSms = async (phone, message) => {
  if (!phone) return;
  try {
    await sendSMS({ to: phone, message });
  } catch (error) {
    logger.error(`Notification SMS failed for ${phone}: ${error.message}`);
  }
};

export const notifySeller = async ({
  retailerId,
  type,
  title,
  message,
  metadata = {},
}) => {
  const notification = await Notification.create({
    retailerId,
    type,
    title,
    message,
    metadata,
  });
  const retailer = await Retailer.findById(retailerId).select(
    "phone ownerName shopName",
  );
  const consoleMessage = `${title}: ${message}`;
  logger.info("[CONSOLE SELLER NOTIFICATION]", {
    sellerName: retailer?.ownerName,
    shopName: retailer?.shopName,
    phone: retailer?.phone,
    type,
    message: consoleMessage,
  });
  await sendNotificationSms(retailer?.phone, consoleMessage);
  return notification;
};
export const notifyBuyer = async ({
  buyerId,
  type,
  title,
  message,
  metadata = {},
}) => {
  if (!buyerId) return null;
  const notification = await BuyerNotification.create({
    buyerId,
    type,
    title,
    message,
    metadata,
  });
  const buyer = await Buyer.findById(buyerId).select("phone name");
  const consoleMessage = `${title}: ${message}`;
  logger.info("[CONSOLE BUYER NOTIFICATION]", {
    buyerName: buyer?.name,
    phone: buyer?.phone,
    type,
    message: consoleMessage,
  });
  await sendNotificationSms(buyer?.phone, consoleMessage);
  return notification;
};

export const notifyPlatformAdmins = async ({
  type,
  title,
  message,
  metadata = {},
}) => {
  const admins = await PlatformAdmin.find({ isActive: true }).select(
    "_id name phone",
  );
  if (!admins.length) {
    logger.warn(
      "[PLATFORM ADMIN NOTIFICATION] No active platform administrators found",
      {
        type,
        title,
      },
    );
    return [];
  }
  admins.forEach((admin) => {
    logger.info("[CONSOLE ADMIN NOTIFICATION]", {
      adminName: admin.name,
      phone: admin.phone,
      type,
      message: `${title}: ${message}`,
    });
  });
  await Promise.all(
    admins.map((admin) =>
      sendNotificationSms(admin.phone, `${title}: ${message}`),
    ),
  );
  const notifications = await PlatformAdminNotification.insertMany(
    admins.map((admin) => ({
      adminId: admin._id,
      type,
      title,
      message,
      metadata,
    })),
  );
  logger.info("[PLATFORM ADMIN NOTIFICATION] Stored notification", {
    type,
    adminCount: notifications.length,
    title,
  });
  return notifications;
};

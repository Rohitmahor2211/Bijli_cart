import crypto from 'crypto';
import { env } from '../config/env.js';
import { Buyer } from '../models/buyer.model.js';
import { Order } from '../models/order.model.js';
import { notifyBuyer } from './notification.service.js';
import { logger } from '../utils/logger.js';

let shiprocketToken = ''; let shiprocketTokenExpiresAt = 0;
const baseUrl = 'https://apiv2.shiprocket.in/v1/external';
const packageDefaults = () => ({ weight: env.SHIPPING_DEFAULT_WEIGHT_KG, length: env.SHIPPING_DEFAULT_LENGTH_CM, breadth: env.SHIPPING_DEFAULT_BREADTH_CM, height: env.SHIPPING_DEFAULT_HEIGHT_CM });
const packageForOrder = (order) => {
  const fallback = packageDefaults();
  const items = order.items || [];
  if (!items.length) return fallback;
  return {
    weight: Number(items.reduce((sum, item) => sum + Number(item.logistics?.weightKg || fallback.weight) * item.quantity, 0).toFixed(2)),
    length: Math.max(...items.map((item) => Number(item.logistics?.lengthCm || fallback.length))),
    breadth: Math.max(...items.map((item) => Number(item.logistics?.breadthCm || fallback.breadth))),
    height: Number(items.reduce((sum, item) => sum + Number(item.logistics?.heightCm || fallback.height) * item.quantity, 0).toFixed(2)),
  };
};
const shippingError = (message, statusCode = 502) => Object.assign(new Error(message), { statusCode });
const isMockShippingMode = () => env.SHIPPING_PROVIDER === 'mock' || env.NODE_ENV === 'test' || !env.SHIPROCKET_EMAIL || !env.SHIPROCKET_PASSWORD;
const normalizeAddress = (value = {}) => ({
  street: value.street || value.address || value.addressLine1 || value.line1 || '',
  city: value.city || '',
  state: value.state || '',
  pincode: value.pincode || '',
});
const requiredAddressFields = ['street', 'city', 'state', 'pincode'];
const validateShipmentAddresses = (order, retailer) => {
  const shippingAddress = normalizeAddress(order?.shippingAddress || order?.billingAddress || {});
  const missingDeliveryFields = requiredAddressFields.filter((field) => !String(shippingAddress[field] || '').trim());
  if (missingDeliveryFields.length) {
    throw shippingError('Please add the buyer billing/shipping address first before creating the shipment.', 400);
  }

  if (!isMockShippingMode()) {
    const pickupAddress = normalizeAddress({
      address: retailer?.address || retailer?.street || retailer?.pickupAddress || retailer?.billingAddress || '',
      city: retailer?.city || '',
      state: retailer?.state || '',
      pincode: retailer?.pincode || '',
    });
    const missingPickupFields = ['street', 'city', 'state', 'pincode'].filter((field) => !String(pickupAddress[field] || '').trim());
    if (missingPickupFields.length) {
      throw shippingError('Please complete the retailer store address before creating the shipment.', 400);
    }
  }
};

const shiprocketTokenForRequest = async () => {
  if (shiprocketToken && shiprocketTokenExpiresAt > Date.now()) return shiprocketToken;
  const response = await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.SHIPROCKET_EMAIL, password: env.SHIPROCKET_PASSWORD }) });
  const data = await response.json();
  if (!response.ok || !data.token) throw shippingError(data.message || 'Shiprocket authentication failed.');
  shiprocketToken = data.token; shiprocketTokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
  return shiprocketToken;
};
const formatProviderError = (data, status) => {
  if (typeof data === 'string') return data;
  if (data?.message) return data.message;
  if (data?.errors) return typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors);
  if (data?.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  return `Shiprocket request failed with status ${status}.`;
};

const shiprocketRequest = async (path, { method = 'GET', body } = {}) => {
  const token = await shiprocketTokenForRequest();
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = raw;
  }
  if (!response.ok) {
    const detail = formatProviderError(data, response.status);
    logger.warn(`[SHIPROCKET] ${method} ${path} failed: ${detail}`);
    throw shippingError(detail, response.status >= 400 && response.status < 500 ? 400 : 502);
  }
  return data;
};

export const checkServiceability = async ({ pickupPincode, deliveryPincode, paymentMethod = 'Prepaid', packageDetails = null }) => {
  const pkg = packageDetails || packageDefaults();
  if (isMockShippingMode()) return { serviceable: true, estimatedCharge: 0, courierOptions: [{ courierId: 'mock_standard', courierName: 'BiljiKact Test Logistics', rate: 0, estimatedDeliveryDays: 3 }], package: pkg };
  const query = new URLSearchParams({ pickup_postcode: pickupPincode, delivery_postcode: deliveryPincode, weight: String(pkg.weight), cod: paymentMethod === 'COD' ? '1' : '0' });
  const data = await shiprocketRequest(`/courier/serviceability/?${query}`);
  const couriers = data.data?.available_courier_companies || [];
  return { serviceable: couriers.length > 0, estimatedCharge: couriers[0]?.rate || 0, courierOptions: couriers.map((courier) => ({ courierId: courier.courier_company_id, courierName: courier.courier_name, rate: Number(courier.rate || 0), estimatedDeliveryDays: courier.etd || null })), package: pkg };
};

const buildOrderPayload = async (order, retailer) => {
  validateShipmentAddresses(order, retailer);
  const buyer = await Buyer.findById(order.buyerId);
  if (!buyer) throw shippingError('Buyer details are unavailable for shipment.', 400);
  const address = normalizeAddress(order?.shippingAddress || order?.billingAddress || {});
  const [firstName, ...rest] = buyer.name.trim().split(/\s+/);
  const pkg = packageForOrder(order);
  const phone = buyer.phone.replace(/^\+91/, '').replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(phone)) throw shippingError('Buyer phone must be a valid 10-digit Indian mobile number before shipment creation.', 400);
  if (!env.SHIPROCKET_PICKUP_LOCATION.trim()) throw shippingError('Shiprocket pickup location is not configured.', 400);
  const customerEmail = buyer.email || retailer.email;
  if (!customerEmail) throw shippingError('Buyer or retailer email is required before shipment creation.', 400);
  const customer = {
    name: firstName,
    lastName: rest.join(' ') || '-',
    address: address.street,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: 'India',
    email: customerEmail,
    phone,
  };
  return {
    order_id: order.orderNumber,
    order_date: new Date(order.createdAt).toISOString().slice(0, 10),
    pickup_location: env.SHIPROCKET_PICKUP_LOCATION.trim(),
    billing_customer_name: customer.name,
    billing_last_name: customer.lastName,
    billing_address: customer.address,
    billing_city: customer.city,
    billing_pincode: customer.pincode,
    billing_state: customer.state,
    billing_country: customer.country,
    billing_email: customer.email,
    billing_phone: customer.phone,
    shipping_is_billing: true,
    shipping_customer_name: customer.name,
    shipping_last_name: customer.lastName,
    shipping_address: customer.address,
    shipping_city: customer.city,
    shipping_pincode: customer.pincode,
    shipping_state: customer.state,
    shipping_country: customer.country,
    shipping_email: customer.email,
    shipping_phone: customer.phone,
    order_items: order.items.map((item) => ({
      name: item.productName,
      sku: item.sku || `SKU-${item.productId}`,
      units: Number(item.quantity),
      selling_price: Number(item.price),
      discount: Number(item.discount || 0),
      tax: Number(item.tax || 0),
    })),
    payment_method: 'Prepaid',
    shipping_charges: Number(order.shipping || 0),
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: Number(order.discount || 0),
    sub_total: Number(order.subtotal),
    length: pkg.length,
    breadth: pkg.breadth,
    height: pkg.height,
    weight: pkg.weight,
  };
};

export const createShipment = async ({ order, retailer }) => {
  validateShipmentAddresses(order, retailer);
  if (isMockShippingMode()) { const awb = `MOCK${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`; return { provider: 'MOCK', providerOrderId: `mock_order_${order.id || order._id || 'order'}`, providerShipmentId: `mock_shipment_${order.id || order._id || 'order'}`, carrier: 'BiljiKact Test Logistics', trackingNumber: awb, trackingUrl: `https://tracking.bijlicart.local/${awb}`, labelUrl: `https://labels.bijlicart.local/${awb}.pdf`, pickupScheduledAt: new Date() }; }
  const created = await shiprocketRequest('/orders/create/adhoc', { method: 'POST', body: await buildOrderPayload(order, retailer) });
  const assigned = await shiprocketRequest('/courier/assign/awb', { method: 'POST', body: { shipment_id: created.shipment_id } });
  const label = await shiprocketRequest('/courier/generate/label', { method: 'POST', body: { shipment_id: [created.shipment_id] } });
  await shiprocketRequest('/courier/generate/pickup', { method: 'POST', body: { shipment_id: [created.shipment_id] } });
  return { provider: 'SHIPROCKET', providerOrderId: String(created.order_id), providerShipmentId: String(created.shipment_id), carrier: assigned.data?.courier_name || assigned.courier_name || 'Shiprocket courier', trackingNumber: assigned.response?.data?.awb_code || assigned.awb_code, trackingUrl: '', labelUrl: label.label_url || label.data?.label_url || '', pickupScheduledAt: new Date() };
};

export const trackShipment = async (shipment) => {
  if (isMockShippingMode()) return { status: shipment.trackingNumber?.includes('OFD') ? 'OUT_FOR_DELIVERY' : 'SHIPPED', events: [] };
  const data = await shiprocketRequest(`/courier/track/awb/${encodeURIComponent(shipment.trackingNumber)}`);
  const activity = data.tracking_data?.shipment_track_activities || [];
  const status = String(data.tracking_data?.shipment_track?.[0]?.current_status || '').toUpperCase();
  const normalizedStatus = status.includes('DELIVERED') ? 'DELIVERED' : status.includes('OUT FOR DELIVERY') ? 'OUT_FOR_DELIVERY' : status.includes('SHIPPED') || status.includes('IN TRANSIT') ? 'SHIPPED' : 'SHIPPED';
  return { status: normalizedStatus, events: activity };
};

export const createReturnPickup = async ({ order }) => {
  // Shiprocket's account-specific reverse-pickup API is enabled per merchant.
  // A mock return flow remains usable until that capability is provisioned.
  if (isMockShippingMode()) { const awb = `RETURN${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`; return { provider: 'MOCK', trackingNumber: awb, labelUrl: `https://labels.bijlicart.local/return-${awb}.pdf`, pickupScheduledAt: new Date() }; }
  throw shippingError('Enable Shiprocket reverse-pickup API for this merchant before creating live return pickups.', 501);
};

export const syncActiveShipments = async () => {
  const orders = await Order.find({ orderStatus: { $in: ['SHIPPED', 'OUT_FOR_DELIVERY'] }, 'shipment.trackingNumber': { $ne: '' }, isDeleted: false }).limit(100);
  let updated = 0;
  for (const order of orders) {
    try {
      const tracking = await trackShipment(order.shipment);
      if (tracking.status === order.orderStatus) continue;
      order.orderStatus = tracking.status;
      if (tracking.status === 'DELIVERED') order.shipment.deliveredAt = new Date();
      order.timeline.push({ status: tracking.status, comment: 'Status updated automatically from courier tracking.' });
      await order.save();
      await notifyBuyer({ buyerId: order.buyerId, type: tracking.status === 'DELIVERED' ? 'ORDER_DELIVERED' : 'ORDER_SHIPPED', title: tracking.status === 'DELIVERED' ? 'Order delivered' : 'Order out for delivery', message: `${order.orderNumber} is ${tracking.status === 'OUT_FOR_DELIVERY' ? 'out for delivery' : 'delivered'}.`, metadata: { orderId: order._id } });
      updated += 1;
    } catch { /* A single courier issue must not stop the next shipment sync. */ }
  }
  return { scanned: orders.length, updated };
};

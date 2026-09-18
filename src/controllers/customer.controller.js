import { Customer } from '../models/customer.model.js';
import { Order } from '../models/order.model.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, formatPaginationMeta } from '../utils/pagination.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

export const createCustomer = asyncWrapper(async (req, res) => {
  const { name, phone, email, addresses } = req.body;

  const existing = await Customer.findOne({
    retailerId: req.retailerId,
    phone,
    isDeleted: false,
  });

  if (existing) {
    return sendError(res, `Customer with phone number '${phone}' already exists.`, null, 409);
  }

  const customer = await Customer.create({
    retailerId: req.retailerId,
    name,
    phone,
    email: email || '',
    addresses: addresses || [],
  });

  return sendSuccess(res, 'Customer created successfully.', { customer }, 201);
});

export const getCustomers = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { search } = req.query;

  const filter = {
    retailerId: req.retailerId,
    isDeleted: false,
  };

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: searchRegex }, { phone: searchRegex }, { email: searchRegex }];
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);

  const paginationMeta = formatPaginationMeta(total, page, limit);

  return sendSuccess(res, 'Customers fetched successfully.', { customers }, 200, paginationMeta);
});

export const getCustomerById = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const customer = await Customer.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!customer) {
    return sendError(res, 'Customer not found.', null, 404);
  }

  const recentOrders = await Order.find({
    customerId: customer._id,
    retailerId: req.retailerId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(10);

  return sendSuccess(res, 'Customer details fetched.', { customer, recentOrders });
});

export const updateCustomer = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, addresses, isActive } = req.body;

  const customer = await Customer.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!customer) {
    return sendError(res, 'Customer not found.', null, 404);
  }

  if (phone && phone !== customer.phone) {
    const duplicate = await Customer.findOne({
      retailerId: req.retailerId,
      phone,
      _id: { $ne: customer._id },
      isDeleted: false,
    });
    if (duplicate) {
      return sendError(res, `Another customer with phone '${phone}' already exists.`, null, 409);
    }
    customer.phone = phone;
  }

  if (name) customer.name = name;
  if (email !== undefined) customer.email = email;
  if (addresses !== undefined) customer.addresses = addresses;
  if (isActive !== undefined) customer.isActive = Boolean(isActive);

  await customer.save();
  return sendSuccess(res, 'Customer updated successfully.', { customer });
});

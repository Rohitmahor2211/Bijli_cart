import api from './axios';

export const createOrder = (data) =>
  api.post('/orders', data);

export const getOrders = (params = {}) =>
  api.get('/orders', { params });

export const getOrderById = (id) =>
  api.get(`/orders/${id}`);

import api from './axios';

// Public — no auth needed
export const getPublicProducts = (params = {}) =>
  api.get('/products/public', { params });

export const getPublicProductById = (id) =>
  api.get(`/products/public/${id}`);

// Seller protected
export const getSellerProducts = (params = {}) =>
  api.get('/products', { params });

export const createProduct = (data) =>
  api.post('/products', data);

export const updateProduct = (id, data) =>
  api.patch(`/products/${id}`, data);

export const deleteProduct = (id) =>
  api.delete(`/products/${id}`);

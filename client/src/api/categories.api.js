import api from './axios';

// Public — no auth needed
export const getPublicCategories = () =>
  api.get('/categories/public');

// Seller protected
export const getCategories = () =>
  api.get('/categories');

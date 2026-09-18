import api from './axios';

export const sendOtp = (phone) =>
  api.post('/auth/send-otp', { phone });

export const verifyOtp = (phone, otp) =>
  api.post('/auth/verify-otp', { phone, otp });

export const registerSeller = (data) =>
  api.post('/auth/register', data);

export const loginSeller = (data) =>
  api.post('/auth/login', data);

export const getMe = () =>
  api.get('/auth/me');

export const logoutSeller = () =>
  api.post('/auth/logout');

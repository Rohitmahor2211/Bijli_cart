import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { Retailer } from '../src/models/retailer.model.js';
import { OTP } from '../src/models/otp.model.js';

describe('1. Authentication & OTP Integration Tests', () => {
  let savedDevOtp = '';

  beforeAll(async () => {
    await connectDB();
    await Retailer.deleteMany({ phone: '+919999900001' });
    await OTP.deleteMany({ phone: '+919999900001' });
  });

  const testRetailer = {
    shopName: 'Test Electronics',
    ownerName: 'Test Owner',
    phone: '+919999900001',
    email: 'test@electronics.com',
    password: 'Password123!', address: '12 Market Road, Sector 4', city: 'Delhi', state: 'Delhi', pincode: '110001',
    gstNumber: '', panNumber: 'ABCDE1234F', mainCategory: 'Electronics', deliveryPreference: 'SELLER_DELIVERY',
    accountHolderName: 'Test Owner', accountNumber: '123456789012', confirmAccountNumber: '123456789012', ifscCode: 'SBIN0001234', bankName: 'State Bank', branchName: 'Sector 4', upiId: 'seller@upi', agreementAccepted: 'true',
  };

  const registerRequest = () => {
    return request(app).post('/api/auth/register').send(testRetailer);
  };

  it('1.1 Should register a new retailer successfully', async () => {
    const res = await registerRequest();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.retailer).toHaveProperty('shopName', testRetailer.shopName);
    expect(res.body.data.retailer).not.toHaveProperty('passwordHash');
  });

  it('1.2 Should prevent registration with duplicate phone number', async () => {
    const res = await registerRequest();
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('1.25 Should require seller approval before login', async () => {
    const res = await request(app).post('/api/auth/login').send({ phone: testRetailer.phone, password: testRetailer.password });
    expect(res.status).toBe(403);
  });

  it('1.3 Should login with valid credentials and send OTP', async () => {
    await Retailer.updateOne({ phone: testRetailer.phone }, { $set: { sellerStatus: 'APPROVED' } });
    const res = await request(app).post('/api/auth/login').send({
      phone: testRetailer.phone,
      password: testRetailer.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requiresOtp).toBe(true);
    expect(res.body.data).toHaveProperty('devOtp');
    savedDevOtp = res.body.data.devOtp;
  });

  it('1.4 Should verify OTP and return access & refresh tokens', async () => {
    const verifyRes = await request(app).post('/api/auth/verify-otp').send({
      phone: testRetailer.phone,
      otp: savedDevOtp,
      purpose: 'LOGIN',
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data).toHaveProperty('accessToken');
    expect(verifyRes.headers['set-cookie']).toBeDefined();
  });
});

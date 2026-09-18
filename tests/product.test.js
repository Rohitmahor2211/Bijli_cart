import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { Retailer } from '../src/models/retailer.model.js';
import { Category } from '../src/models/category.model.js';
import { Product } from '../src/models/product.model.js';
import { GlobalCategory } from '../src/models/globalCategory.model.js';

describe('2. Product Management & Multi-Tenant Isolation Tests', () => {
  let tokenA = '';
  let tokenB = '';
  let categoryAId = '';
  let productAId = '';
  let globalCategoryId = '';
  const registerRetailer = (data) => request(app).post('/api/auth/register').field({
    ...data, address: '12 Market Road, Sector 4', city: 'Delhi', state: 'Delhi', pincode: '110001',
    gstNumber: data.phone.endsWith('1') ? '07ABCDE1234F1Z5' : '07ABCDE1234F2Z4', panNumber: data.phone.endsWith('1') ? 'ABCDE1234F' : 'ABCDE1234G',
    mainCategory: 'Electronics', deliveryPreference: 'SELLER_DELIVERY', accountHolderName: data.ownerName, accountNumber: data.phone.endsWith('1') ? '123456789012' : '123456789013', confirmAccountNumber: data.phone.endsWith('1') ? '123456789012' : '123456789013', ifscCode: 'SBIN0001234', bankName: 'State Bank', branchName: 'Sector 4', agreementAccepted: 'true',
  }).attach('panDocument', Buffer.from('pan'), 'pan.pdf').attach('gstDocument', Buffer.from('gst'), 'gst.pdf').attach('businessProofDocument', Buffer.from('proof'), 'proof.pdf');

  beforeAll(async () => {
    await connectDB();
    await Retailer.deleteMany({ phone: { $in: ['+918888800001', '+918888800002'] } });

    // Setup Retailer A
    await registerRetailer({
      shopName: 'Shop A',
      ownerName: 'Owner A',
      phone: '+918888800001',
      email: 'shopA@test.com',
      password: 'Password123!',
    });
    await Retailer.updateOne({ phone: '+918888800001' }, { $set: { sellerStatus: 'APPROVED' } });
    const loginA = await request(app).post('/api/auth/login').send({
      phone: '+918888800001',
      password: 'Password123!',
    });
    const verifyA = await request(app).post('/api/auth/verify-otp').send({
      phone: '+918888800001',
      otp: loginA.body.data.devOtp,
    });
    tokenA = verifyA.body.data.accessToken;

    // Setup Retailer B
    await registerRetailer({
      shopName: 'Shop B',
      ownerName: 'Owner B',
      phone: '+918888800002',
      email: 'shopB@test.com',
      password: 'Password123!',
    });
    await Retailer.updateOne({ phone: '+918888800002' }, { $set: { sellerStatus: 'APPROVED' } });
    const loginB = await request(app).post('/api/auth/login').send({
      phone: '+918888800002',
      password: 'Password123!',
    });
    const verifyB = await request(app).post('/api/auth/verify-otp').send({
      phone: '+918888800002',
      otp: loginB.body.data.devOtp,
    });
    tokenB = verifyB.body.data.accessToken;

    // Create category for Retailer A
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Gadgets', description: 'Cool gadgets' });
    categoryAId = catRes.body.data.category._id;
    const globalCategory = await GlobalCategory.findOneAndUpdate(
      { slug: 'test-smartphones' },
      { $set: { name: 'Test Smartphones', isActive: true, isLeaf: true, parentId: null, path: [], level: 0, navigation: { showInHeader: false, headerPosition: 999, showOnHome: false } }, $setOnInsert: { slug: 'test-smartphones' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    globalCategoryId = String(globalCategory._id);
  });

  it('2.1 Retailer A should create a product successfully', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Smart Watch X',
        sku: 'SKU-WATCH-X',
        category: categoryAId,
        globalCategoryId,
        mrp: 5000,
        sellingPrice: 4500,
        stockQuantity: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product).toHaveProperty('sku', 'SKU-WATCH-X');
    expect(res.body.data.product.status).toBe('PENDING_REVIEW');
    productAId = res.body.data.product._id;
  });

  it('2.2 Retailer B MUST NOT be able to access Retailer A product by ID (Tenant Isolation)', async () => {
    const res = await request(app)
      .get(`/api/products/${productAId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('2.3 Retailer A should retrieve list containing its product', async () => {
    const res = await request(app)
      .get('/api/products?search=Watch')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThan(0);
  });

  it('2.4 Retailer A should soft delete the product', async () => {
    const res = await request(app)
      .delete(`/api/products/${productAId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

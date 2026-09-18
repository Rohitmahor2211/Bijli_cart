import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { Retailer } from '../src/models/retailer.model.js';
import { Category } from '../src/models/category.model.js';
import { Product } from '../src/models/product.model.js';
import { GlobalCategory } from '../src/models/globalCategory.model.js';
import { PlatformAdmin } from '../src/models/platformAdmin.model.js';

describe('Catalog visibility, product moderation, and specification validation', () => {
  let sellerToken = '';
  let adminToken = '';
  let sellerCategoryId = '';
  let mobilesCategoryId = '';
  let tvsCategoryId = '';
  let productId = '';
  const sellerPhone = '+918888800011';
  const adminPhone = '+919999900099';

  const registerRetailer = (data) => request(app).post('/api/auth/register').field({
    ...data, address: '12 Market Road, Sector 4', city: 'Delhi', state: 'Delhi', pincode: '110001',
    gstNumber: '07ABCDE1234F3Z3', panNumber: 'ABCDE1234H',
    mainCategory: 'Electronics', deliveryPreference: 'SELLER_DELIVERY', accountHolderName: data.ownerName, accountNumber: '123456789014', confirmAccountNumber: '123456789014', ifscCode: 'SBIN0001234', bankName: 'State Bank', branchName: 'Sector 4', agreementAccepted: 'true',
  }).attach('panDocument', Buffer.from('pan'), 'pan.pdf').attach('gstDocument', Buffer.from('gst'), 'gst.pdf').attach('businessProofDocument', Buffer.from('proof'), 'proof.pdf');

  beforeAll(async () => {
    await connectDB();
    await Retailer.deleteMany({ phone: sellerPhone });
    await PlatformAdmin.deleteMany({ phone: adminPhone });

    await registerRetailer({
      shopName: 'Catalog Shop',
      ownerName: 'Catalog Owner',
      phone: sellerPhone,
      email: 'catalog.shop@test.com',
      password: 'Password123!',
    });
    await Retailer.updateOne({ phone: sellerPhone }, { $set: { sellerStatus: 'APPROVED', isActive: true } });
    const login = await request(app).post('/api/auth/login').send({ phone: sellerPhone, password: 'Password123!' });
    const verify = await request(app).post('/api/auth/verify-otp').send({ phone: sellerPhone, otp: login.body.data.devOtp });
    sellerToken = verify.body.data.accessToken;

    await PlatformAdmin.create({
      name: 'Catalog Admin',
      phone: adminPhone,
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    const adminLogin = await request(app).post('/api/platform-admin/login').send({ phone: adminPhone });
    const adminVerify = await request(app).post('/api/platform-admin/login/verify-otp').send({
      phone: adminPhone,
      otp: adminLogin.body.data.devOtp,
    });
    adminToken = adminVerify.body.data.accessToken;

    const sellerCategory = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Seller Gadgets', description: 'Internal category' });
    sellerCategoryId = sellerCategory.body.data.category._id;

    const mobiles = await GlobalCategory.findOneAndUpdate(
      { slug: 'mobiles-smartphones' },
      { $set: { name: 'Smartphones', isActive: true, isLeaf: true, parentId: null, path: [], level: 0, navigation: { showInHeader: false, headerPosition: 999, showOnHome: false }, specificationDefinitions: [{ key: 'ram', label: 'RAM', type: 'text', required: true }, { key: 'storage', label: 'Storage', type: 'text', required: true }, { key: 'network', label: 'Network', type: 'text', required: true }] }, $setOnInsert: { slug: 'mobiles-smartphones' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const tvs = await GlobalCategory.findOneAndUpdate(
      { slug: 'tvs-smart-tvs' },
      { $set: { name: 'Smart TVs', isActive: true, isLeaf: true, parentId: null, path: [], level: 0, navigation: { showInHeader: false, headerPosition: 999, showOnHome: false } }, $setOnInsert: { slug: 'tvs-smart-tvs' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    mobilesCategoryId = String(mobiles._id);
    tvsCategoryId = String(tvs._id);
  });

  it('rejects mobile products that are missing required specifications', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Incomplete Phone',
        sku: 'SKU-PHONE-INCOMPLETE',
        category: sellerCategoryId,
        globalCategoryId: mobilesCategoryId,
        brand: 'PixelBrand',
        mrp: 20000,
        sellingPrice: 18000,
        stockQuantity: 4,
        specifications: { ram: '8 GB' },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/storage|network/i);
  });

  it('keeps new products pending and hidden from the buyer category page', async () => {
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Galaxy Test Phone',
        sku: 'SKU-PHONE-VISIBLE',
        category: sellerCategoryId,
        globalCategoryId: mobilesCategoryId,
        brand: 'PixelBrand',
        description: 'A 5G smartphone',
        mrp: 25000,
        sellingPrice: 22000,
        stockQuantity: 5,
        specifications: { ram: '8 GB', storage: '128 GB', network: '5G' },
      });

    expect(created.status).toBe(201);
    expect(created.body.data.product.status).toBe('PENDING_REVIEW');
    expect(created.body.data.product.specifications.ram).toBe('8 GB');
    expect(created.body.data.product.specifications.network).toBe('5G');
    productId = created.body.data.product._id;

    const listing = await request(app).get('/api/catalog/categories/mobiles-smartphones/products');
    expect(listing.status).toBe(200);
    expect(listing.body.data.products.some((product) => product._id === productId)).toBe(false);
  });

  it('stores a rejection reason for the seller and keeps the product off buyer pages', async () => {
    const rejected = await request(app)
      .patch(`/api/platform-admin/products/${productId}/moderation`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'REJECTED', reason: 'Images do not match the listed specifications.' });

    expect(rejected.status).toBe(200);
    expect(rejected.body.data.product.status).toBe('REJECTED');
    expect(rejected.body.data.product.rejectionReason).toBe('Images do not match the listed specifications.');

    const sellerView = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(sellerView.body.data.product.status).toBe('REJECTED');
    expect(sellerView.body.data.product.rejectionReason).toBe('Images do not match the listed specifications.');

    const listing = await request(app).get('/api/catalog/categories/mobiles-smartphones/products');
    expect(listing.body.data.products.some((product) => product._id === productId)).toBe(false);
  });

  it('resubmits a rejected product after a description change and then publishes it only on the matching category', async () => {
    const resubmitted = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ description: 'Updated 5G smartphone description for review.' });

    expect(resubmitted.status).toBe(200);
    expect(resubmitted.body.data.product.status).toBe('PENDING_REVIEW');
    expect(resubmitted.body.data.product.rejectionReason).toBe('');

    const approved = await request(app)
      .patch(`/api/platform-admin/products/${productId}/moderation`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVED' });
    expect(approved.body.data.product.status).toBe('ACTIVE');

    const mobiles = await request(app).get('/api/catalog/categories/mobiles-smartphones/products');
    expect(mobiles.body.data.products.some((product) => String(product._id) === String(productId))).toBe(true);

    const tvs = await request(app).get('/api/catalog/categories/tvs-smart-tvs/products');
    expect(tvs.body.data.products.some((product) => String(product._id) === String(productId))).toBe(false);
  });

  it('does not re-review price-only edits but does re-review title changes', async () => {
    const priceOnly = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ sellingPrice: 21000, mrp: 24999 });
    expect(priceOnly.body.data.product.status).toBe('ACTIVE');
    expect(priceOnly.body.data.product.pricing.sellingPrice).toBe(21000);

    const titleChange = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Galaxy Test Phone Plus' });
    expect(titleChange.body.data.product.status).toBe('PENDING_REVIEW');

    const listing = await request(app).get('/api/catalog/categories/mobiles-smartphones/products');
    expect(listing.body.data.products.some((product) => String(product._id) === String(productId))).toBe(false);
  });

  it('filters buyer category products by stored specifications', async () => {
    await Product.updateOne({ _id: productId }, { $set: { status: 'ACTIVE', rejectionReason: '' } });
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Budget Phone',
        sku: 'SKU-PHONE-BUDGET',
        category: sellerCategoryId,
        globalCategoryId: mobilesCategoryId,
        brand: 'ValueBrand',
        mrp: 12000,
        sellingPrice: 9999,
        stockQuantity: 8,
        specifications: { ram: '4 GB', storage: '64 GB', network: '4G' },
      });
    const budget = await Product.findOne({ sku: 'SKU-PHONE-BUDGET' });
    await Product.updateOne({ _id: budget._id }, { $set: { status: 'ACTIVE' } });

    const filtered = await request(app).get('/api/catalog/categories/mobiles-smartphones/products').query({ ram: '8 GB', brand: 'PixelBrand' });
    expect(filtered.status).toBe(200);
    const ids = filtered.body.data.products.map((product) => String(product._id));
    expect(ids).toContain(String(productId));
    expect(ids).not.toContain(String(budget._id));
    expect(filtered.body.data.filters.some((filter) => filter.key === 'ram' && filter.values.includes('8 GB'))).toBe(true);
  });

  it('lets Platform Admin update stored specifications without publishing unpublished products', async () => {
    const updated = await request(app)
      .patch(`/api/platform-admin/products/${productId}/specifications`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ specifications: { ram: '12 GB', storage: '256 GB', network: '5G' } });
    expect(updated.status).toBe(200);
    expect(updated.body.data.product.status).toBe('ACTIVE');
    expect(updated.body.data.product.specifications.ram).toBe('12 GB');
    expect(updated.body.data.product.specifications.storage).toBe('256 GB');
  });

  it('supports category-aware buyer search against approved products only', async () => {
    await Product.updateOne({ _id: productId }, { $set: { status: 'ACTIVE', rejectionReason: '' } });
    const found = await request(app).get('/api/catalog/search').query({ q: 'Galaxy', category: 'mobiles-smartphones' });
    expect(found.status).toBe(200);
    expect(found.body.data.products.some((product) => String(product._id) === String(productId))).toBe(true);

    const wrongCategory = await request(app).get('/api/catalog/search').query({ q: 'Galaxy', category: 'tvs-smart-tvs' });
    expect(wrongCategory.body.data.products.some((product) => String(product._id) === String(productId))).toBe(false);
  });

  it('hides an active product when the seller is no longer approved', async () => {
    await Retailer.updateOne({ phone: sellerPhone }, { $set: { sellerStatus: 'SUSPENDED', isActive: false } });
    const listing = await request(app).get('/api/catalog/categories/mobiles-smartphones/products');
    expect(listing.body.data.products.some((product) => String(product._id) === String(productId))).toBe(false);
    await Retailer.updateOne({ phone: sellerPhone }, { $set: { sellerStatus: 'APPROVED', isActive: true } });
  });
});

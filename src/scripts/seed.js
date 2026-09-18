import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { Retailer } from '../models/retailer.model.js';
import { Category } from '../models/category.model.js';
import { Product } from '../models/product.model.js';
import { Inventory, InventoryHistory } from '../models/inventory.model.js';
import { Customer } from '../models/customer.model.js';
import { Order } from '../models/order.model.js';
import { Offer } from '../models/offer.model.js';
import { logger } from '../utils/logger.js';

const seedDatabase = async () => {
  try {
    if (process.env.NODE_ENV !== 'development' || process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
      throw new Error('Refusing to run destructive seed. Set NODE_ENV=development and ALLOW_DESTRUCTIVE_SEED=true explicitly.');
    }

    await connectDB();
    logger.info('🌱 Starting database seeding process...');

    // Clear existing collections
    await Retailer.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await InventoryHistory.deleteMany({});
    await Customer.deleteMany({});
    await Order.deleteMany({});
    await Offer.deleteMany({});

    // 1. Create Demo Retailer
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@1234', salt);

    const retailer = await Retailer.create({
      shopName: 'Apex Electronics Hub',
      ownerName: 'Avnish Kumar',
      phone: '+919876543210',
      email: 'admin@apexelectronics.com',
      passwordHash,
      address: '102 Tech Mall, M.G. Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      gstNumber: '29ABCDE1234F1Z5',
      panNumber: 'ABCDE1234F',
      businessHours: '10:00 AM - 9:00 PM',
      mainCategory: 'Electronics',
      deliveryPreference: 'SELLER_DELIVERY',
      bankDetails: {
        accountHolderName: 'Avnish Kumar',
        accountNumberLast4: '7890',
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
        branchName: 'M.G. Road',
      },
      sellerAgreement: { accepted: true, acceptedAt: new Date() },
      sellerStatus: 'APPROVED',
      isActive: true,
      isVerified: true,
    });
    logger.info(`✅ Seeded Retailer: ${retailer.shopName} (Phone: ${retailer.phone})`);

    // 2. Create Categories & Subcategories
    const mobileCat = await Category.create({
      retailerId: retailer._id,
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Latest iOS and Android smartphones',
    });

    const laptopCat = await Category.create({
      retailerId: retailer._id,
      name: 'Laptops & Computers',
      slug: 'laptops-computers',
      description: 'Ultra-thin laptops and desktop computers',
    });

    const audioCat = await Category.create({
      retailerId: retailer._id,
      name: 'Audio & Wearables',
      slug: 'audio-wearables',
      description: 'Noise-canceling headphones and wireless earbuds',
    });

    logger.info('✅ Seeded 3 Product Categories.');

    // 3. Create Sample Products
    const p1 = await Product.create({
      retailerId: retailer._id,
      name: 'Apple iPhone 15 Pro 128GB',
      slug: `iphone-15-pro-128gb-${Date.now()}`,
      sku: 'APL-IPH15P-128',
      brand: 'Apple',
      modelNumber: 'A3102',
      category: mobileCat._id,
      status: 'ACTIVE',
      description: 'Titanium design with A17 Pro chip and customizable Action button.',
      pricing: {
        mrp: 134900,
        sellingPrice: 124900,
        purchasePrice: 110000,
        discount: 10000,
        tax: 18,
      },
      inventory: {
        stockQuantity: 15,
        lowStockThreshold: 3,
      },
      warranty: {
        available: true,
        duration: '1 Year Manufacturer Warranty',
      },
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          publicId: 'retailer/products/mock_iphone15',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      createdBy: retailer._id,
    });

    await Inventory.create({
      retailerId: retailer._id,
      productId: p1._id,
      currentStock: 15,
      reservedStock: 0,
      lowStockThreshold: 3,
    });

    const p2 = await Product.create({
      retailerId: retailer._id,
      name: 'Sony WH-1000XM5 Wireless Headphones',
      slug: `sony-wh1000xm5-${Date.now()}`,
      sku: 'SNY-WHXM5-BLK',
      brand: 'Sony',
      modelNumber: 'WH-1000XM5',
      category: audioCat._id,
      status: 'ACTIVE',
      description: 'Industry-leading noise canceling headphones with 30-hour battery life.',
      pricing: {
        mrp: 34990,
        sellingPrice: 29990,
        purchasePrice: 24000,
        discount: 5000,
        tax: 18,
      },
      inventory: {
        stockQuantity: 8,
        lowStockThreshold: 2,
      },
      warranty: {
        available: true,
        duration: '1 Year Brand Warranty',
      },
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          publicId: 'retailer/products/mock_sony',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      createdBy: retailer._id,
    });

    await Inventory.create({
      retailerId: retailer._id,
      productId: p2._id,
      currentStock: 8,
      reservedStock: 0,
      lowStockThreshold: 2,
    });

    logger.info('✅ Seeded Sample Electronics Products and Inventories.');

    // 4. Create Sample Customer
    const customer = await Customer.create({
      retailerId: retailer._id,
      name: 'Rahul Sharma',
      phone: '+919988776655',
      email: 'rahul.sharma@example.com',
      addresses: [
        {
          street: 'Flat 402, Green Valley Apartments, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
          isDefault: true,
        },
      ],
      totalOrders: 1,
      totalSpent: 29990,
    });
    logger.info(`✅ Seeded Customer: ${customer.name}`);

    // 5. Create Sample Order
    const order = await Order.create({
      orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-1001`,
      retailerId: retailer._id,
      customerId: customer._id,
      items: [
        {
          productId: p2._id,
          productName: p2.name,
          sku: p2.sku,
          quantity: 1,
          price: 29990,
          discount: 5000,
          tax: 5398,
          subtotal: 29990,
        },
      ],
      subtotal: 29990,
      discount: 0,
      tax: 5398,
      shipping: 0,
      grandTotal: 35388,
      paymentStatus: 'PAID',
      paymentMethod: 'UPI',
      orderStatus: 'DELIVERED',
      shippingAddress: {
        street: 'Flat 402, Green Valley Apartments, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
      },
      timeline: [
        { status: 'PENDING', comment: 'Order placed', timestamp: new Date() },
        { status: 'DELIVERED', comment: 'Order delivered by courier', timestamp: new Date() },
      ],
    });
    logger.info(`✅ Seeded Sample Order: ${order.orderNumber}`);

    // 6. Create Sample Offer
    const offer = await Offer.create({
      retailerId: retailer._id,
      name: 'Festive Electronics Sale',
      code: 'FESTIVE10',
      type: 'PERCENTAGE',
      value: 10,
      minimumOrderValue: 5000,
      maximumDiscount: 2000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    });
    logger.info(`✅ Seeded Sample Promo Offer Code: ${offer.code}`);

    logger.info('🎉 Seed completed successfully!');
    logger.info('----------------------------------------------------');
    logger.info('DEMO CREDENTIALS:');
    logger.info(`Retailer Phone: ${retailer.phone}`);
    logger.info('Retailer Password: Admin@1234');
    logger.info('----------------------------------------------------');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();

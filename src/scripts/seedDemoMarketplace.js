import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { Buyer } from '../models/buyer.model.js';
import { GlobalCategory } from '../models/globalCategory.model.js';
import { Inventory } from '../models/inventory.model.js';
import { PlatformAdmin } from '../models/platformAdmin.model.js';
import { Product } from '../models/product.model.js';
import { Retailer } from '../models/retailer.model.js';
import { getCategorySpecificationDefinitions } from '../services/catalogFilters.service.js';

const sellerPassword = 'Seller@12345';
const adminPhone = '+919700000001';
const imageUrls = [
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/coffee.jpg',
  'https://res.cloudinary.com/demo/image/upload/elephants.jpg',
  'https://res.cloudinary.com/demo/image/upload/shoes.jpg',
  'https://res.cloudinary.com/demo/image/upload/watch.jpg',
];
const productTemplates = [
  ['Pro Smartphone 5G 256GB', 'NovaTech', 'Mobiles', 44999],
  ['4K Smart LED Television 55 inch', 'VisionMax', 'Televisions', 64999],
  ['Inverter Split Air Conditioner 1.5 Ton', 'CoolBreeze', 'Air Conditioners', 42999],
  ['Double Door Frost Free Refrigerator  frost', 'FreshCore', 'Refrigerators', 38999],
  ['Business Laptop Intel Core i7 16GB', 'WorkPro', 'Laptops', 74999],
  ['Front Load Washing Machine 8kg', 'HomeWash', 'Washing Machines', 32999],
  ['Wireless Noise Cancelling Headphones', 'SoundPeak', 'Audio', 8999],
  ['Ultra HD Gaming Monitor 27 inch', 'PixelForge', 'Televisions', 27999],
  ['Fast Charge Wireless Earbuds', 'SoundPeak', 'Audio', 4999],
  ['Creator Laptop 16GB 1TB SSD', 'WorkPro', 'Laptops', 89999],
  ['Smart AMOLED Phone 128GB', 'NovaTech', 'Mobiles', 32999],
  ['Convertible Window Air Conditioner', 'CoolBreeze', 'Air Conditioners', 36999],
  ['Inverter Double Door Refrigerator', 'FreshCore', 'Refrigerators', 45999],
  ['Bluetooth Party Speaker 100W', 'SoundPeak', 'Audio', 12999],
  ['Top Load Fully Automatic Washer', 'HomeWash', 'Washing Machines', 24999],
];

const sellers = Array.from({ length: 5 }, (_, index) => ({
  shopName: `Demo Electronics Hub ${index + 1}`,
  ownerName: `Demo Seller ${index + 1}`,
  phone: `+91980000000${index + 1}`,
  email: `demo.seller${index + 1}@bijlicart.test`,
  panNumber: `DEMOA${1000 + index}A`,
  city: ['Delhi', 'Mumbai', 'Bengaluru', 'Pune', 'Hyderabad'][index],
}));

const buyers = Array.from({ length: 5 }, (_, index) => ({
  name: `Demo Buyer ${index + 1}`,
  phone: `+91990000000${index + 1}`,
  email: `demo.buyer${index + 1}@bijlicart.test`,
  city: ['Delhi', 'Mumbai', 'Bengaluru', 'Pune', 'Hyderabad'][index],
}));

const createSpecifications = (categoryName, index) => ({
  brand: productTemplates[index][1],
  category: categoryName,
  model: `DEMO-${categoryName.slice(0, 3).toUpperCase()}-${index + 1}`,
  color: ['Black', 'Silver', 'Blue', 'White', 'Grey'][index % 5],
  warranty: '1 Year Manufacturer Warranty',
  connectivity: 'Wi-Fi, Bluetooth',
});

const specificationValue = (key, index, categoryName) => {
  const values = {
    processor: ['Snapdragon 7 Gen 3', 'Intel Core i5', 'MediaTek Dimensity 7050'][index % 3],
    processorGeneration: ['13th Gen', '12th Gen', 'Ryzen 7000 Series'][index % 3],
    displaySize: ['6.7 inch', '6.5 inch', '15.6 inch'][index % 3],
    displayType: ['AMOLED', 'IPS LCD', 'LED'][index % 3],
    resolution: ['FHD+', '4K UHD', '1920 x 1080'][index % 3],
    refreshRate: ['120 Hz', '90 Hz', '60 Hz'][index % 3],
    batteryCapacity: ['5000 mAh', '6000 mAh', '4500 mAh'][index % 3],
    rearCamera: ['50 MP + 8 MP', '108 MP + 12 MP', '64 MP + 8 MP'][index % 3],
    frontCamera: ['16 MP', '32 MP', '8 MP'][index % 3],
    operatingSystem: ['Android 15', 'Android 14', 'Windows 11'][index % 3],
    network: ['5G', '4G LTE', '5G + Wi-Fi 6'][index % 3],
    simType: ['Dual Nano SIM', 'Nano SIM + eSIM', 'Single Nano SIM'][index % 3],
    screenSize: ['55 inch', '43 inch', '65 inch'][index % 3],
    smartPlatform: ['Google TV', 'Android TV', 'WebOS'][index % 3],
    hdr: ['HDR10+', 'Dolby Vision', 'HDR10'][index % 3],
    smartTv: ['Yes', 'Yes', 'No'][index % 3],
    hdmiPorts: ['3', '4', '2'][index % 3],
    usbPorts: ['2', '3', '1'][index % 3],
    wifi: ['Yes', 'Yes', 'No'][index % 3],
    bluetooth: ['Yes', 'Yes', 'Yes'][index % 3],
    speakerOutput: ['20 W', '30 W', '40 W'][index % 3],
    acType: categoryName.toLowerCase().includes('window') ? 'Window AC' : 'Split AC',
    capacity: ['1.5 Ton', '2 Ton', '1 Ton'][index % 3],
    tonnage: ['1.5 Ton', '2 Ton', '1 Ton'][index % 3],
    starRating: ['5 Star', '4 Star', '3 Star'][index % 3],
    coolingCapacity: ['5100 W', '6100 W', '3500 W'][index % 3],
    compressorType: ['Inverter', 'Dual Rotary', 'Reciprocatory'][index % 3],
    inverter: ['Yes', 'Yes', 'No'][index % 3],
    energyRating: ['5 Star', '4 Star', '3 Star'][index % 3],
    roomSize: ['120-180 sq ft', '180-240 sq ft', '90-120 sq ft'][index % 3],
    refrigerant: ['R32', 'R290', 'R410A'][index % 3],
    noiseLevel: ['32 dB', '38 dB', '42 dB'][index % 3],
    refrigeratorType: ['Frost Free', 'Direct Cool', 'Frost Free'][index % 3],
    doorType: ['Double Door', 'Single Door', 'Side-by-Side'][index % 3],
    coolingTechnology: ['Multi Airflow', 'Smart Cooling', 'Twin Cooling'][index % 3],
    defrostSystem: ['Automatic', 'Manual', 'Automatic'][index % 3],
    height: ['170 cm', '155 cm', '180 cm'][index % 3],
    width: ['60 cm', '55 cm', '75 cm'][index % 3],
    depth: ['68 cm', '62 cm', '72 cm'][index % 3],
    ram: ['8 GB', '16 GB', '12 GB'][index % 3],
    ramType: ['LPDDR5', 'DDR5', 'LPDDR4X'][index % 3],
    storage: ['128 GB', '256 GB', '1 TB'][index % 3],
    storageType: ['UFS 3.1', 'NVMe SSD', 'SSD'][index % 3],
    graphicsCard: ['Integrated', 'RTX 4060', 'RTX 4050'][index % 3],
    battery: ['5000 mAh', '70 Wh', '56 Wh'][index % 3],
    weight: ['1.7 kg', '2.2 kg', '1.4 kg'][index % 3],
    loadType: categoryName.toLowerCase().includes('top') ? 'Top Load' : 'Front Load',
    washingMachineType: 'Fully Automatic',
    motorType: ['Inverter Motor', 'Digital Inverter', 'Universal Motor'][index % 3],
    spinSpeed: ['1400 RPM', '1200 RPM', '1000 RPM'][index % 3],
    washPrograms: ['12 Programs', '10 Programs', '8 Programs'][index % 3],
    audioType: categoryName.toLowerCase().includes('earbud') ? 'True Wireless Earbuds' : categoryName.toLowerCase().includes('speaker') ? 'Bluetooth Speaker' : 'Wireless Headphones',
    connectivity: ['Bluetooth 5.4', 'Bluetooth 5.3', 'Bluetooth 5.0'][index % 3],
  };
  return values[key] || `${key} specification ${index + 1}`;
};

const createCategorySpecifications = (category, index) => Object.fromEntries(
  getCategorySpecificationDefinitions(category).map((definition) => [
    definition.key,
    specificationValue(definition.key, index, category.name),
  ]),
);

const seed = async () => {
  if (process.env.NODE_ENV !== 'development' || process.env.ALLOW_DEMO_DATA_SEED !== 'true') {
    throw new Error('Refusing demo seed. Set NODE_ENV=development and ALLOW_DEMO_DATA_SEED=true.');
  }

  await connectDB();
  const passwordHash = await bcrypt.hash(sellerPassword, 12);
  const roots = await GlobalCategory.find({
    name: { $in: [...new Set(productTemplates.map(([, , category]) => category))] },
    isActive: true,
  }).lean();
  const categoryByName = new Map(roots.map((category) => [category.name, category]));
  if (categoryByName.size !== 7) {
    throw new Error('Run npm run seed:global-categories before seeding demo marketplace data.');
  }

  const admin = await PlatformAdmin.findOneAndUpdate(
    { phone: adminPhone },
    { $setOnInsert: { name: 'Demo Platform Admin', phone: adminPhone, role: 'SUPER_ADMIN', isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const sellerRecords = [];
  for (const seller of sellers) {
    const record = await Retailer.findOneAndUpdate(
      { phone: seller.phone },
      {
        $set: {
          ...seller,
          passwordHash,
          address: `${100 + seller.phone.slice(-1)} Demo Market`,
          state: 'Demo State',
          pincode: '110001',
          gstNumber: '',
          mainCategory: 'Electronics',
          deliveryPreference: 'AVNISH_DELIVERY',
          bankDetails: {
            accountHolderName: seller.ownerName,
            accountNumberLast4: '0001',
            ifscCode: 'SBIN0001234',
            bankName: 'Demo State Bank',
            branchName: 'Demo Main Branch',
            upiId: `demo${seller.phone.slice(-1)}@upi`,
          },
          sellerAgreement: { accepted: true, acceptedAt: new Date() },
          sellerStatus: 'APPROVED',
          isActive: true,
          isVerified: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    sellerRecords.push(record);
  }

  const buyerRecords = [];
  for (const buyer of buyers) {
    const record = await Buyer.findOneAndUpdate(
      { phone: buyer.phone },
      { $set: { ...buyer, defaultAddress: { street: 'Demo Main Road', city: buyer.city, state: 'Demo State', pincode: '110001' }, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    buyerRecords.push(record);
  }

  let productsCreated = 0;
  for (const [sellerIndex, seller] of sellerRecords.entries()) {
    for (const [productIndex, [name, brand, categoryName, price]] of productTemplates.entries()) {
      const sku = `DEMO-S${sellerIndex + 1}-P${productIndex + 1}`;
      const category = categoryByName.get(categoryName);
      const product = await Product.findOneAndUpdate(
        { retailerId: seller._id, sku },
        {
          $set: {
            name,
            slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-seller-${sellerIndex + 1}`,
            brand,
            modelNumber: `MODEL-${sellerIndex + 1}-${productIndex + 1}`,
            globalCategoryId: category._id,
            description: `${name} from ${brand}, listed by ${seller.shopName}. Suitable for marketplace checkout and product detail testing.`,
            highlights: ['Verified demo listing', 'Manufacturer warranty included', 'Secure platform checkout'],
            pricing: { mrp: price + Math.round(price * 0.12), sellingPrice: price, purchasePrice: Math.round(price * 0.78), discount: 12, tax: 18 },
            inventory: { stockQuantity: 50, lowStockThreshold: 5 },
            logistics: { weightKg: 2, lengthCm: 30, breadthCm: 20, heightCm: 12 },
            warranty: { available: true, duration: '1 Year Manufacturer Warranty', description: 'Demo warranty information for UI testing.' },
            specifications: createSpecifications(categoryName, productIndex),
            images: imageUrls.map((url, imageIndex) => ({ url, publicId: '', isPrimary: imageIndex === 0, sortOrder: imageIndex })),
            status: 'ACTIVE',
            isDeleted: false,
            createdBy: seller._id,
          },
          $setOnInsert: { retailerId: seller._id, sku },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await Inventory.findOneAndUpdate(
        { retailerId: seller._id, productId: product._id },
        { $set: { currentStock: 50, reservedStock: 0, lowStockThreshold: 5 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      productsCreated += 1;
    }
  }

  // Seed every leaf category so child tabs (Smartphones, Split ACs, etc.)
  // contain active products and every category-defined filter has real values.
  const leafCategories = await GlobalCategory.find({ isActive: true, isLeaf: true }).lean();
  const brands = ['NovaTech', 'VisionMax', 'CoolBreeze', 'FreshCore', 'WorkPro', 'SoundPeak', 'PixelForge', 'HomeWash'];
  for (const [sellerIndex, seller] of sellerRecords.entries()) {
    for (const [categoryIndex, category] of leafCategories.entries()) {
      const basePrice = 8999 + ((categoryIndex * 7000 + sellerIndex * 1300) % 65000);
      const brand = brands[(categoryIndex + sellerIndex) % brands.length];
      const name = `${brand} ${category.name} ${sellerIndex + 1}`;
      const sku = `DEMO-S${sellerIndex + 1}-${category.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;
      const product = await Product.findOneAndUpdate(
        { retailerId: seller._id, sku },
        {
          $set: {
            name,
            slug: `${category.slug}-${brand.toLowerCase()}-${sellerIndex + 1}`,
            brand,
            modelNumber: `MODEL-${category.slug.toUpperCase()}-${sellerIndex + 1}`,
            globalCategoryId: category._id,
            description: `${name} with complete category specifications, verified demo warranty and GST-inclusive checkout pricing.`,
            highlights: ['Verified demo listing', 'Complete technical specifications', 'Manufacturer warranty included'],
            pricing: { mrp: basePrice + Math.round(basePrice * 0.15), sellingPrice: basePrice, purchasePrice: Math.round(basePrice * 0.78), discount: 15, tax: 18 },
            inventory: { stockQuantity: 50, lowStockThreshold: 5 },
            logistics: { weightKg: 2, lengthCm: 30, breadthCm: 20, heightCm: 12 },
            warranty: { available: true, duration: '1 Year Manufacturer Warranty', description: 'Demo warranty information for UI testing.' },
            specifications: createCategorySpecifications(category, sellerIndex + categoryIndex),
            images: imageUrls.map((url, imageIndex) => ({ url, publicId: '', isPrimary: imageIndex === 0, sortOrder: imageIndex })),
            status: 'ACTIVE',
            isDeleted: false,
            createdBy: seller._id,
          },
          $setOnInsert: { retailerId: seller._id, sku },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await Inventory.findOneAndUpdate(
        { retailerId: seller._id, productId: product._id },
        { $set: { currentStock: 50, reservedStock: 0, lowStockThreshold: 5 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      productsCreated += 1;
    }
  }

  const report = `# Demo Marketplace Test Accounts

Generated: ${new Date().toISOString()}

## SMS/OTP mode

SMS delivery is selected by \`SMS_PROVIDER\` (Twilio or Fast2SMS).
Test mode uses a non-network provider and exposes OTP only to automated tests.
Production logs never include OTP values or full phone numbers.

## SMS dispatcher

The central dispatcher in \`src/services/sms/sms.service.js\` routes through the
configured provider. Keep provider credentials in the deployment secret store.

| File | Current line | Function / purpose |
|---|---:|---|
| \`src/services/sms/sms.service.js\` | 1-15 | Provider selection and test-mode isolation |
| \`src/services/sms/twilio.provider.js\` | 1-18 | Twilio delivery |
| \`src/services/sms/fast2sms.provider.js\` | 1-27 | Fast2SMS delivery |

## Platform admin

| Name | Phone | Login |
|---|---|---|
| ${admin.name} | ${admin.phone} | Request OTP; read the backend terminal |

## Retailers

All five retailers are seeded as APPROVED. Password login still requires the terminal OTP.

| Retailer | Shop | Phone | Password |
|---|---|---|---|
${sellerRecords.map((seller) => `| ${seller.ownerName} | ${seller.shopName} | ${seller.phone} | ${sellerPassword} |`).join('\n')}

## Buyers

Buyer login is OTP-only. Request OTP with the listed phone and read the backend terminal.

| Buyer | Phone |
|---|---|
${buyerRecords.map((buyer) => `| ${buyer.name} | ${buyer.phone} |`).join('\n')}

## Products

- Sellers created: ${sellerRecords.length}
- Buyers created: ${buyerRecords.length}
- Products created/updated: ${productsCreated}
- Products per seller in this seed: ${productTemplates.length + leafCategories.length}
- Active products per leaf category: ${sellerRecords.length}
- Leaf categories covered: ${leafCategories.length}
- Images per product: ${imageUrls.length}
- Duplicate catalog items across sellers are intentional for multi-seller checkout testing.

## Safe seed command

\`$env:ALLOW_DEMO_DATA_SEED="true"; npm run seed:demo-marketplace\`

This command is additive/upsert-based. It does not delete existing sellers, buyers, products, orders or categories.

## Seed implementation

The additive demo-data script is \`src/scripts/seedDemoMarketplace.js\`.
It creates/updates the five approved retailers, five OTP buyers, one demo
platform admin, root demo products plus active products in every leaf category
and inventory records. It intentionally
uses five image URLs per product and repeats catalog items across sellers so
multi-seller checkout can be tested.
`;
  await fs.writeFile(path.resolve(process.cwd(), 'DEMO_MARKETPLACE_TEST_ACCOUNTS_2026-09-15_HI.md'), report, 'utf8');
  console.log(report);
  await disconnectDB();
};

try {
  await seed();
} catch (error) {
  console.error(error);
  await disconnectDB();
  process.exitCode = 1;
}

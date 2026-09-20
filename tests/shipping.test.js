import { describe, expect, it } from 'vitest';
import { checkServiceability, createReturnPickup, createShipment, trackShipment } from '../src/services/shipping.service.js';

const order = {
  id: 'order-1',
  orderNumber: 'BC-TEST-001',
  createdAt: new Date('2026-09-11T00:00:00.000Z'),
  buyerId: 'buyer-1',
  shippingAddress: {
    street: '12 Market Road',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
  },
  items: [
    {
      productName: 'Test device',
      sku: 'TEST-DEVICE',
      quantity: 1,
      price: 999,
      subtotal: 999,
      logistics: {
        weightKg: 0.5,
        lengthCm: 20,
        breadthCm: 15,
        heightCm: 10,
      },
    },
  ],
  subtotal: 999,
};

describe('Shipping provider integration contract', () => {
  it('returns a serviceability result in mock mode', async () => {
    const result = await checkServiceability({
      pickupPincode: '110001',
      deliveryPincode: '400001',
    });

    expect(result.serviceable).toBe(true);
    expect(result.courierOptions[0]).toMatchObject({
      courierId: 'mock_standard',
      courierName: 'BiljiKact Test Logistics',
    });
    expect(result.package.weight).toBe(0.5);
  });

  it('creates a trackable mock shipment and refreshes its status', async () => {
    const shipment = await createShipment({ order, retailer: { email: 'seller@example.com' } });

    expect(shipment).toMatchObject({
      provider: 'MOCK',
      providerOrderId: 'mock_order_order-1',
      carrier: 'BiljiKact Test Logistics',
    });
    expect(shipment.trackingNumber).toMatch(/^MOCK[A-Z0-9]{12}$/);

    const tracking = await trackShipment(shipment);
    expect(tracking).toEqual({ status: 'SHIPPED', events: [] });
  });

  it('creates a mock return pickup with a tracking number', async () => {
    const returnShipment = await createReturnPickup({ order });

    expect(returnShipment.provider).toBe('MOCK');
    expect(returnShipment.trackingNumber).toMatch(/^RETURN[A-Z0-9]{10}$/);
    expect(returnShipment.labelUrl).toContain(returnShipment.trackingNumber);
  });
});

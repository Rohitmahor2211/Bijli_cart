import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { Buyer } from '../src/models/buyer.model.js';
import { BuyerSession } from '../src/models/buyerSession.model.js';
import { OTP } from '../src/models/otp.model.js';

describe('Buyer OTP authentication', () => {
  const buyer = { name: 'Buyer Test', phone: '+919999900002', email: 'buyer@example.com', city: 'Delhi' };
  let otp = '';
  let agent;

  beforeAll(async () => {
    await connectDB();
    await Buyer.deleteMany({ phone: buyer.phone });
    await BuyerSession.deleteMany({});
    await OTP.deleteMany({ phone: buyer.phone });
    agent = request.agent(app);
  });

  it('registers, verifies OTP, and exposes a protected customer session', async () => {
    const registration = await agent.post('/api/buyer-auth/register').send(buyer);
    expect(registration.status).toBe(201);

    const sendOtp = await agent.post('/api/buyer-auth/login/send-otp').send({ phone: buyer.phone });
    expect(sendOtp.status).toBe(200);
    expect(sendOtp.body.data.devOtp).toMatch(/^\d{6}$/);
    otp = sendOtp.body.data.devOtp;

    const verification = await agent.post('/api/buyer-auth/verify-otp').send({ phone: buyer.phone, otp });
    expect(verification.status).toBe(200);
    expect(verification.headers['set-cookie']).toBeDefined();

    const me = await agent.get('/api/buyer-auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.buyer.phone).toBe(buyer.phone);
  });
});

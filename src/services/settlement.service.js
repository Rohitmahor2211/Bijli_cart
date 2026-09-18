import mongoose from 'mongoose';
import { PayoutRequest } from '../models/payoutRequest.model.js';
import { SellerLedger } from '../models/sellerLedger.model.js';
import { Retailer } from '../models/retailer.model.js';
import { env } from '../config/env.js';
import { decryptBankAccount, encryptBankAccount } from './bankEncryption.service.js';

export const refreshAvailableLedgerEntries = async (retailerId) => {
  await SellerLedger.updateMany(
    { retailerId, status: 'PENDING', availableAt: { $lte: new Date() } },
    { $set: { status: 'AVAILABLE' } }
  );
};

export const getSellerSettlementSummary = async (retailerId) => {
  await refreshAvailableLedgerEntries(retailerId);
  const entries = await SellerLedger.find({ retailerId, status: { $in: ['PENDING', 'AVAILABLE', 'RESERVED', 'PAID', 'VOID'] } }).sort({ createdAt: -1 });
  const total = (status) => entries.filter((entry) => entry.status === status).reduce((sum, entry) => sum + entry.amount, 0);
  return {
    pendingAmount: total('PENDING'),
    availableAmount: total('AVAILABLE'),
    requestedAmount: total('RESERVED'),
    paidAmount: total('PAID'),
    currency: 'INR',
    entries: entries.map((entry) => ({ id: entry.id, type: entry.entryType, amount: entry.amount, status: entry.status, availableAt: entry.availableAt, createdAt: entry.createdAt, orderId: entry.orderId, metadata: entry.metadata })),
  };
};

export const reserveAutomaticPayout = async (retailerId) => {
  const session = await mongoose.startSession();
  try {
    let payout;
    await session.withTransaction(async () => {
      const entries = await SellerLedger.find({ retailerId, status: 'AVAILABLE' }).sort({ createdAt: 1 }).session(session);
      const availableAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
      if (availableAmount <= 0) return;
      const payoutId = new mongoose.Types.ObjectId();
      const entryIds = entries.map((entry) => entry._id);
      const claim = await SellerLedger.updateMany(
        { _id: { $in: entryIds }, retailerId, status: 'AVAILABLE' },
        { $set: { status: 'RESERVED', 'metadata.payoutRequestId': payoutId.toString() } },
        { session },
      );
      if (claim.modifiedCount !== entryIds.length) return;
      payout = new PayoutRequest({
        _id: payoutId,
        retailerId,
        amount: availableAmount,
        ledgerEntryIds: entryIds,
      });
      await payout.save({ session });
    });
    return payout;
  } finally { await session.endSession(); }
};

const authHeader = () => `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
const razorpayXRequest = async (path, body) => {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, { method: 'POST', headers: { Authorization: authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.description || 'RazorpayX payout request failed.');
  return result;
};

const ensureFundAccount = async (retailer) => {
  if (retailer.payoutProviderFundAccountId) return retailer.payoutProviderFundAccountId;
  let accountNumber;
  if (retailer.bankDetails.accountNumberEncrypted) {
    accountNumber = decryptBankAccount(retailer.bankDetails.accountNumberEncrypted);
  } else if (retailer.bankDetails.accountNumber) {
    // Safe lazy migration for legacy records: encrypt before any payout use.
    accountNumber = retailer.bankDetails.accountNumber;
    retailer.bankDetails.accountNumberEncrypted = encryptBankAccount(accountNumber);
    retailer.bankDetails.accountNumberLast4 = accountNumber.slice(-4);
    retailer.bankDetails.accountNumber = undefined;
  } else throw new Error('Seller bank account is unavailable for payout.');
  const contact = await razorpayXRequest('/contacts', { name: retailer.bankDetails.accountHolderName, type: 'vendor', reference_id: `seller_${retailer.id}`, email: retailer.email, contact: retailer.phone });
  const fund = await razorpayXRequest('/fund_accounts', { contact_id: contact.id, account_type: 'bank_account', bank_account: { name: retailer.bankDetails.accountHolderName, ifsc: retailer.bankDetails.ifscCode, account_number: accountNumber } });
  retailer.payoutProviderFundAccountId = fund.id;
  await retailer.save();
  return fund.id;
};

const sendAutomaticPayout = async (payout) => {
  if (env.PAYMENT_PROVIDER === 'mock') return { id: `mock_payout_${payout.id}`, status: 'processed' };
  const retailer = await Retailer.findById(payout.retailerId).select('+payoutProviderFundAccountId +bankDetails.accountNumberEncrypted +bankDetails.accountNumber');
  if (!retailer?.isActive || retailer.sellerStatus !== 'APPROVED') throw new Error('Seller account is not eligible for payout.');
  const fundAccountId = await ensureFundAccount(retailer);
  return razorpayXRequest('/payouts', { account_number: env.RAZORPAYX_ACCOUNT_NUMBER, fund_account_id: fundAccountId, amount: Math.round(payout.amount * 100), currency: payout.currency, mode: 'IMPS', purpose: 'payout', queue_if_low_balance: true, reference_id: payout.id });
};

export const runAutomaticPayouts = async () => {
  if (!env.AUTO_PAYOUT_ENABLED) return { processed: 0, failed: 0 };
  await SellerLedger.updateMany({ status: 'PENDING', availableAt: { $lte: new Date() } }, { $set: { status: 'AVAILABLE' } });
  const retailers = await SellerLedger.distinct('retailerId', { status: 'AVAILABLE' });
  let processed = 0; let failed = 0;
  for (const retailerId of retailers) {
    const payout = await reserveAutomaticPayout(retailerId);
    if (!payout) continue;
    try {
      const transfer = await sendAutomaticPayout(payout);
      payout.transferReference = transfer.id;
      payout.status = transfer.status === 'processed' ? 'PAID' : 'PROCESSING';
      payout.processedAt = payout.status === 'PAID' ? new Date() : null;
      await payout.save();
      if (payout.status === 'PAID') await SellerLedger.updateMany({ _id: { $in: payout.ledgerEntryIds }, status: 'RESERVED' }, { $set: { status: 'PAID' } });
      processed += 1;
    } catch (error) {
      payout.status = 'FAILED'; payout.failureReason = error.message.slice(0, 500); await payout.save();
      await SellerLedger.updateMany({ _id: { $in: payout.ledgerEntryIds }, status: 'RESERVED' }, { $set: { status: 'AVAILABLE' }, $unset: { 'metadata.payoutRequestId': '' } });
      failed += 1;
    }
  }
  return { processed, failed };
};

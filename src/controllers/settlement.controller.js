import { asyncWrapper } from '../utils/asyncWrapper.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getSellerSettlementSummary } from '../services/settlement.service.js';

export const getMySettlement = asyncWrapper(async (req, res) => {
  const settlement = await getSellerSettlementSummary(req.retailerId);
  return sendSuccess(res, 'Settlement balance fetched.', { settlement });
});

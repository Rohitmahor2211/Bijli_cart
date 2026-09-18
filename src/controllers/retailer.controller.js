import { Retailer } from '../models/retailer.model.js';
import { uploadImage, deleteImage } from '../services/cloudinary.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

export const getProfile = asyncWrapper(async (req, res) => {
  const retailer = await Retailer.findById(req.retailerId);
  return sendSuccess(res, 'Retailer profile fetched successfully.', { retailer: retailer.toJSON() });
});

export const updateProfile = asyncWrapper(async (req, res) => {
  const retailer = await Retailer.findById(req.retailerId);
  if (!retailer) {
    return sendError(res, 'Retailer profile not found.', null, 404);
  }

  const allowedUpdates = [
    'shopName',
    'ownerName',
    'email',
    'address',
    'city',
    'state',
    'pincode',
    'gstNumber',
    'panNumber',
    'businessHours',
  ];

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      retailer[field] = req.body[field];
    }
  });

  await retailer.save();
  return sendSuccess(res, 'Retailer profile updated successfully.', { retailer: retailer.toJSON() });
});

export const updateLogo = asyncWrapper(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'Logo image file is required.', null, 400);
  }

  const retailer = await Retailer.findById(req.retailerId);
  if (!retailer) {
    return sendError(res, 'Retailer profile not found.', null, 404);
  }

  // Delete previous logo if exists
  if (retailer.shopLogo && retailer.shopLogo.publicId) {
    await deleteImage(retailer.shopLogo.publicId);
  }

  const folder = `retailer/shop/${req.retailerId}`;
  const uploadedLogo = await uploadImage(req.file.buffer, folder);

  retailer.shopLogo = {
    url: uploadedLogo.url,
    publicId: uploadedLogo.publicId,
  };

  await retailer.save();
  return sendSuccess(res, 'Shop logo updated successfully.', {
    shopLogo: retailer.shopLogo,
    retailer: retailer.toJSON(),
  });
});

import cloudinary from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const uploadImage = async (fileBuffer, folder) => {
  if (env.CLOUDINARY_CLOUD_NAME === 'demo_cloud' || env.NODE_ENV === 'test') {
    const mockId = `mock_${folder.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    logger.info(`[MOCK CLOUDINARY] Uploaded image to folder '${folder}': ${mockId}`);
    return {
      url: `https://res.cloudinary.com/demo/image/upload/v1234567890/${folder}/${mockId}.jpg`,
      publicId: `${folder}/${mockId}`,
    };
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      logger.error(`Cloudinary upload timed out after ${env.CLOUDINARY_UPLOAD_TIMEOUT_MS}ms.`);
      reject(Object.assign(new Error('Image upload timed out. Please retry with a smaller image or check the connection.'), { statusCode: 504 }));
    }, env.CLOUDINARY_UPLOAD_TIMEOUT_MS);
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) {
          logger.error('Cloudinary upload error:', error);
          return reject(new Error(`Image upload failed: ${error.message}`));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    stream.end(fileBuffer);
  });
};

export const deleteImage = async (publicId) => {
  if (!publicId || publicId.startsWith('mock_') || env.CLOUDINARY_CLOUD_NAME === 'demo_cloud' || env.NODE_ENV === 'test') {
    logger.info(`[MOCK CLOUDINARY] Deleted image: ${publicId}`);
    return { result: 'ok' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error(`Error deleting Cloudinary image (${publicId}):`, error);
    // Don't throw to prevent breaking core data deletion flows
    return null;
  }
};

export const deleteImages = async (publicIds) => {
  if (!publicIds || !publicIds.length) return;
  await Promise.all(publicIds.map((id) => deleteImage(id)));
};

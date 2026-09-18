import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPEG, JPG, PNG, and WEBP image files are allowed.');
    error.statusCode = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max size
  },
});

export const uploadProductImages = upload.array('images', 10);
export const uploadSingleLogo = upload.single('logo');
export const uploadSingleCategoryImage = upload.single('image');

const sellerDocumentUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    const error = new Error('Seller documents must be a PDF, JPEG, PNG, or WEBP file.');
    error.statusCode = 400;
    cb(error, false);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
});

export const uploadSellerDocuments = sellerDocumentUpload.fields([
  { name: 'panDocument', maxCount: 1 },
  { name: 'gstDocument', maxCount: 1 },
  { name: 'businessProofDocument', maxCount: 1 },
]);

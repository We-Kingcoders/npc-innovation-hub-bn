import express from 'express';
import multer from 'multer';
import { submitApplication } from '../controllers/application.controller';
import { validateApplicationSubmission } from '../validations/application.validation';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

// image accepts image files; applicationLetter accepts PDF only
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.fieldname === 'applicationLetter') {
    if (!file.originalname.match(/\.pdf$/i)) {
      return cb(new Error('applicationLetter must be a PDF file!'), false);
    }
    return cb(null, true);
  }
  if (file.fieldname === 'image') {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('Only image files are allowed for image!'), false);
    }
    return cb(null, true);
  }
  cb(new Error('Unexpected file field!'), false);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Public route - no auth
router.post(
  '/',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'applicationLetter', maxCount: 1 },
  ]),
  validateApplicationSubmission,
  submitApplication
);

export default router;

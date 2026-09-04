import express from 'express';
import multer from 'multer';
import { protectRoute, restrictTo } from '../../middlewares/auth.middleware';
import { createAlumnus, getAlumniAdmin, updateAlumnus, deleteAlumnus } from '../../controllers/admin/alumnus.controller';
import { validateAlumnusCreate, validateAlumnusUpdate } from '../../validations/alumnus.validation';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

// image-only, matching the plain image field pattern used elsewhere
// (application.routes.ts) - distinct from the video and raw/PDF patterns.
const fileFilter = (req: any, file: any, cb: any) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error('Only image files (jpg, jpeg, png, gif) are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, matching this project's other plain-image uploads
});

// Same pattern as event.routes.ts / hubVideo.routes.ts: multer's own errors
// (oversized file, fileFilter rejection) land here as an `err` argument.
const multerErrorHandler = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      status: 'fail',
      message: `File upload error: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
  next();
};

router.use(protectRoute, restrictTo('Admin'));

router.post('/', upload.single('image'), multerErrorHandler, validateAlumnusCreate, createAlumnus);
router.get('/', getAlumniAdmin);
router.patch('/:id', upload.single('image'), multerErrorHandler, validateAlumnusUpdate, updateAlumnus);
router.delete('/:id', deleteAlumnus);

export default router;

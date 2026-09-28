import express from 'express';
import multer from 'multer';
import '../../utils/ensureUploadsDir';
import { protectRoute, restrictTo } from '../../middlewares/auth.middleware';
import {
  getHeroMediaAdmin,
  uploadHeroMedia,
  updateHeroMediaMetadata,
  activateHeroMedia,
  deactivateHeroMedia,
  setDefaultHeroMedia,
  reorderHeroMedia,
  deleteHeroMedia,
} from '../../controllers/admin/heroMedia.controller';
import {
  validateHeroMediaUpload,
  validateUpdateHeroMediaMetadata,
  validateHeroMediaIdParam,
  validateReorderHeroMedia,
} from '../../validations/heroMedia.validation';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

// First-pass filter on the client-declared Content-Type - cheap, but
// spoofable (see heroMedia.controller.ts's sniffUploadedFile for the real,
// content-based check that runs after this). Kept anyway so an obviously
// wrong upload (e.g. a PDF) is rejected before it's even written to disk.
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

const fileFilter = (req: any, file: any, cb: any) => {
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WEBP images or MP4, WEBM, MOV videos are allowed'), false);
  }
  cb(null, true);
};

// 100MB covers video (matches hubVideo.routes.ts/resource.routes.ts) - the
// controller separately rejects an image over 10MB once content-sniffing
// has determined it actually is one, since multer can't know the real
// type before the file filter runs.
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Same pattern as hubVideo.routes.ts: multer's own errors (oversized
// file, fileFilter rejection) land here as an `err` argument rather than
// throwing, so they need their own handler placed right after upload.
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

router.get('/', getHeroMediaAdmin);
router.post('/', upload.single('file'), multerErrorHandler, validateHeroMediaUpload, uploadHeroMedia);
router.patch('/reorder', validateReorderHeroMedia, reorderHeroMedia);
router.patch('/:id/activate', validateHeroMediaIdParam, activateHeroMedia);
router.patch('/:id/deactivate', validateHeroMediaIdParam, deactivateHeroMedia);
router.patch('/:id/default', validateHeroMediaIdParam, setDefaultHeroMedia);
router.patch('/:id', validateHeroMediaIdParam, validateUpdateHeroMediaMetadata, updateHeroMediaMetadata);
router.delete('/:id', validateHeroMediaIdParam, deleteHeroMedia);

export default router;

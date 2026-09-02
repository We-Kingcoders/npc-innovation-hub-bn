import express from 'express';
import multer from 'multer';
import { protectRoute, restrictTo } from '../../middlewares/auth.middleware';
import { uploadHubVideo, getHubVideoAdmin, deleteHubVideo } from '../../controllers/admin/hubVideo.controller';
import { validateHubVideoUpload } from '../../validations/hubVideo.validation';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

// Only common, broadly-compatible video formats - not a blanket video/* accept.
const ALLOWED_VIDEO_MIMETYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

const fileFilter = (req: any, file: any, cb: any) => {
  if (!ALLOWED_VIDEO_MIMETYPES.includes(file.mimetype)) {
    return cb(new Error('Only mp4, mov, and webm video files are allowed'), false);
  }
  cb(null, true);
};

// 100MB matches this project's existing video-upload limit (resource.routes.ts).
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Same pattern as event.routes.ts: multer's own errors (oversized file,
// fileFilter rejection) land here as an `err` argument rather than throwing,
// so they need their own handler placed right after the upload middleware.
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

router.post('/', upload.single('video'), multerErrorHandler, validateHubVideoUpload, uploadHubVideo);
router.get('/', getHubVideoAdmin);
router.delete('/', deleteHubVideo);

export default router;

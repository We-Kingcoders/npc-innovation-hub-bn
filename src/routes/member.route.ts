import express from 'express';
import multer from 'multer';
import { protectRoute, restrictTo } from '../middlewares/auth.middleware';
import * as memberController from '../controllers/member.controller';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
});

// Public routes - accessible to everyone
router.get('/', memberController.getAllMembers);
router.get('/member/:id', memberController.getMemberById);

// Protected routes - require authentication
router.get('/me', protectRoute, memberController.getMyInfo);

router.post(
  '/', 
  protectRoute, 
  upload.single('image'),
  memberController.createOrUpdateMember
);

router.put(
  '/', 
  protectRoute, 
  upload.single('image'),
  memberController.createOrUpdateMember
);

router.post(
  '/contacts', 
  protectRoute,
  memberController.createOrUpdateContacts
);

router.put(
  '/contacts', 
  protectRoute,
  memberController.createOrUpdateContacts
);

router.post(
  '/education', 
  protectRoute,
  upload.single('educationImage'),
  memberController.createOrUpdateEducation
);

router.put(
  '/education', 
  protectRoute,
  upload.single('educationImage'),
  memberController.createOrUpdateEducation
);

router.post(
  '/skills', 
  protectRoute,
  memberController.createOrUpdateSkills
);

router.put(
  '/skills', 
  protectRoute,
  memberController.createOrUpdateSkills
);

router.delete(
  '/', 
  protectRoute,
  memberController.deleteMember
);

// Admin routes
router.post(
  '/import', 
  protectRoute, 
  restrictTo('Admin'),
  memberController.importFromMockData
);

export default router;
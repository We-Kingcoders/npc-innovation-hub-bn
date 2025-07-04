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

// Member profile routes
// POST - Create a new profile
router.post(
  '/', 
  protectRoute, 
  upload.single('image'),
  memberController.createOrUpdateMember
);

// PUT - Replace the entire profile
router.put(
  '/', 
  protectRoute, 
  upload.single('image'),
  memberController.createOrUpdateMember
);

// PATCH - Update specific fields of the profile
router.patch(
  '/', 
  protectRoute, 
  upload.single('image'),
  memberController.createOrUpdateMember
);

// Contact routes
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

router.patch(
  '/contacts', 
  protectRoute,
  memberController.createOrUpdateContacts
);

// Education routes
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

router.patch(
  '/education', 
  protectRoute,
  upload.single('educationImage'),
  memberController.createOrUpdateEducation
);

// Skills routes
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

router.patch(
  '/skills', 
  protectRoute,
  memberController.createOrUpdateSkills
);

// Delete profile
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
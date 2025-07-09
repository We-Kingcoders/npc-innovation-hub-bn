import express from 'express';
import multer from 'multer';
import { protectRoute, restrictTo } from '../middlewares/auth.middleware';
import * as memberController from '../controllers/member.controller';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});
const fileFilter = (req: any, file: any, cb: any) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Public routes
router.get('/', memberController.getAllMembers);
router.get('/member/:id', memberController.getMemberById);

// Get member info by userId (public or protected as needed)
router.get('/:userId', memberController.getMemberInfo);

// Protected member profile routes (userId as path param)
router.post(
  '/:userId', 
  protectRoute, 
  upload.single('image'),
  memberController.createOrUpdateMember
);
router.put(
  '/:userId', 
  protectRoute, 
  upload.single('image'),
  memberController.createOrUpdateMember
);
router.patch(
  '/:userId', 
  protectRoute, 
  upload.single('image'),
  memberController.createOrUpdateMember
);

// Contact routes (userId as path param)
router.post(
  '/:userId/contacts', 
  protectRoute,
  memberController.createOrUpdateContacts
);
router.put(
  '/:userId/contacts', 
  protectRoute,
  memberController.createOrUpdateContacts
);
router.patch(
  '/:userId/contacts', 
  protectRoute,
  memberController.createOrUpdateContacts
);

// Education routes (userId as path param)
router.post(
  '/:userId/education', 
  protectRoute,
  upload.single('educationImage'),
  memberController.createOrUpdateEducation
);
router.put(
  '/:userId/education', 
  protectRoute,
  upload.single('educationImage'),
  memberController.createOrUpdateEducation
);
router.patch(
  '/:userId/education', 
  protectRoute,
  upload.single('educationImage'),
  memberController.createOrUpdateEducation
);

// Skills routes (userId as path param)
router.post(
  '/:userId/skills', 
  protectRoute,
  memberController.createOrUpdateSkills
);
router.put(
  '/:userId/skills', 
  protectRoute,
  memberController.createOrUpdateSkills
);
router.patch(
  '/:userId/skills', 
  protectRoute,
  memberController.createOrUpdateSkills
);

// Delete profile (userId as path param)
router.delete(
  '/:userId', 
  protectRoute,
  memberController.deleteMember
);

export default router;
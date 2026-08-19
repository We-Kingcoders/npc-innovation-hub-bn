import express from 'express';
import multer from 'multer';
import { protectRoute, restrictTo } from '../middlewares/auth.middleware';
import * as memberController from '../controllers/member.controller';
import {
  validateMemberIdParam,
  validateUserIdParam,
  validatePaginationQuery,
  validateMemberUpdateBody,
} from '../validations/member.validation';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});
// image/educationImage fields accept images; cv/resume accept PDF/Word documents
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.fieldname === 'cv' || file.fieldname === 'resume') {
    if (!file.originalname.match(/\.(pdf|doc|docx)$/i)) {
      return cb(new Error(`${file.fieldname === 'cv' ? 'CV' : 'Resume'} must be a PDF or Word document!`), false);
    }
    return cb(null, true);
  }
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
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
router.get('/', validatePaginationQuery, memberController.getAllMembers);
router.get('/member/:id', validateMemberIdParam, memberController.getMemberById);

// Get member info by userId (public)
router.get('/:userId', validateUserIdParam, memberController.getMemberInfo);

// Protected member profile routes (userId as path param)
const profileUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
]);

router.post(
  '/:userId',
  protectRoute,
  profileUpload,
  validateMemberUpdateBody,
  memberController.createOrUpdateMember
);
router.put(
  '/:userId',
  protectRoute,
  profileUpload,
  validateMemberUpdateBody,
  memberController.createOrUpdateMember
);
router.patch(
  '/:userId',
  protectRoute,
  profileUpload,
  validateMemberUpdateBody,
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
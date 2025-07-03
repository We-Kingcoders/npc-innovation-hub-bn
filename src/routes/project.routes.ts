import express from 'express';
import multer from 'multer';
import { protectRoute } from '../middlewares/auth.middleware';
import * as projectController from '../controllers/project.controller';

/**
 * Project Routes
 * Created by: Alain275
 * Created on: 2025-07-03 13:23:21 UTC
 */

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
router.get('/', projectController.getAllProjects);
router.get('/project/:id', projectController.getProjectById);
router.get('/search', projectController.searchProjects);

// Protected routes - require authentication
router.get('/me', protectRoute, projectController.getMyProjects);

router.post(
  '/', 
  protectRoute, 
  upload.single('image'),
  projectController.createProject
);

router.put(
  '/:id', 
  protectRoute, 
  upload.single('image'),
  projectController.updateProject
);

router.delete(
  '/:id', 
  protectRoute,
  projectController.deleteProject
);

export default router;
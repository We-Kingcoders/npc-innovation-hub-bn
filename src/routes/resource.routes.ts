/**
 * Resource Routes
 * Admin-only CRUD operations with read access for all authenticated users
 * Includes video upload support and PATCH method for partial updates
 * 
 * @created_by Alain275
 * @created_at 2025-07-03 19:17:10 UTC
 */

import express from 'express';
import multer from 'multer';
import { protectRoute } from '../middlewares/auth.middleware';
import * as resourceController from '../controllers/resource.controller';

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
  // Accept images and videos
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max file size for videos
});

// Protected routes - require authentication (any user)
router.get('/', protectRoute, resourceController.getAllResources);
router.get('/resource/:id', protectRoute, resourceController.getResourceById);
router.get('/featured', protectRoute, resourceController.getFeaturedResources);
router.get('/saved', protectRoute, resourceController.getSavedResources);
router.get('/search', protectRoute, resourceController.searchResources);
router.get('/category/:category', protectRoute, resourceController.getResourcesByCategory);
router.get('/type/:type', protectRoute, resourceController.getResourcesByType);
router.get('/videos', protectRoute, resourceController.getVideoResources);

// User interaction routes
router.post('/resource/:id/upvote', protectRoute, resourceController.upvoteResource);
router.post('/resource/:id/save', protectRoute, resourceController.saveResource);

// Admin-only routes for CRUD operations
router.post(
  '/', 
  protectRoute, 
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  resourceController.createResource
);

// Full update (PUT)
router.put(
  '/:id', 
  protectRoute, 
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  resourceController.updateResource
);

// Partial update (PATCH)
router.patch(
  '/:id', 
  protectRoute, 
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  resourceController.patchResource
);

router.delete(
  '/:id', 
  protectRoute,
  resourceController.deleteResource
);

export default router;
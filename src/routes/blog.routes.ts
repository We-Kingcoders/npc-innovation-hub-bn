import express from 'express'
import multer from 'multer'
import { protectRoute, restrictTo } from '../middlewares/auth.middleware'
import * as blogController from '../controllers/blog.controller'

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
  }
})

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false)
  }
  cb(null, true)
}

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
})

// Public Routes (No Authentication Required)

// Get all published blogs
router.get('/', blogController.getAllBlogs)

// Get a specific blog by ID
router.get('/blog/:id', blogController.getBlogById)

// Get blogs by category
router.get('/category/:category', blogController.getBlogsByCategory)

// Get featured blogs
router.get('/featured', blogController.getFeaturedBlogs)

// Protected Routes (Authentication Required)

// Get all blogs (Admin only - including unpublished)
router.get('/admin/all', protectRoute, restrictTo('Admin'), blogController.getAllBlogsAdmin)

// Create a new blog (Admin only)
router.post(
  '/', 
  protectRoute, 
  restrictTo('Admin'), 
  upload.single('image'), 
  blogController.createBlog
)

// Partially update a blog (Admin only) - PATCH functionality
router.patch(
  '/:id', 
  protectRoute, 
  restrictTo('Admin'), 
  upload.single('image'), 
  blogController.patchBlog
)

// Delete a blog (Admin only)
router.delete(
  '/:id', 
  protectRoute, 
  restrictTo('Admin'), 
  blogController.deleteBlog
)

// Toggle blog publication status (Admin only)
router.patch(
  '/:id/toggle-publish', 
  protectRoute, 
  restrictTo('Admin'), 
  blogController.toggleBlogPublish
)

export default router
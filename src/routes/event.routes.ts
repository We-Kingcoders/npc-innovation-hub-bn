import express from 'express';
import multer from 'multer';
import { protectRoute, restrictTo } from '../middlewares/auth.middleware';
import * as eventController from '../controllers/event.controller';
import * as attendanceController from '../controllers/attendance.controller';

/**
 * Event Routes
 * Created by: Alain275
 * Created on: 2025-07-04 18:49:20 UTC
 * Updated by: Alain275
 * Updated on: 2025-07-04 19:25:53 UTC
 */

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExt = file.originalname.split('.').pop() || 'jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + fileExt);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  try {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      // Instead of throwing an error, we'll pass false to reject the file silently
      return cb(null, false);
    }
    cb(null, true);
  } catch (error) {
    // In case of any unexpected error, log it and reject the file
    console.error('Error in file filter:', error);
    cb(null, false);
  }
};

// Create a custom error handler middleware for multer
const multerErrorHandler = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    return res.status(400).json({
      status: 'fail',
      message: `File upload error: ${err.message}`
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      status: 'error',
      message: `File upload error: ${err.message}`
    });
  }
  // No error occurred, continue with the request
  next();
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
});

// Public routes - accessible to everyone
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);

// Protected routes - require authentication
router.get('/my-events', protectRoute, attendanceController.getMyEvents);
router.get('/:eventId/rsvp-status', protectRoute, attendanceController.checkRsvpStatus);
router.post('/:eventId/rsvp', protectRoute, attendanceController.rsvpToEvent);
router.patch('/:eventId/cancel-rsvp', protectRoute, attendanceController.cancelRsvp);

// Admin only routes - apply multerErrorHandler after upload middleware
router.post(
  '/', 
  protectRoute, 
  restrictTo('Admin'),
  upload.single('image'),
  multerErrorHandler,
  eventController.createEvent
);

router.patch(
  '/:id', 
  protectRoute, 
  restrictTo('Admin'),
  upload.single('image'),
  multerErrorHandler,
  eventController.updateEvent
);

router.delete(
  '/:id', 
  protectRoute,
  restrictTo('Admin'),
  eventController.deleteEvent
);

router.get(
  '/:id/attendees',
  protectRoute,
  restrictTo('Admin'),
  eventController.getEventAttendees
);

router.post(
  '/:eventId/mark-attendance/:userId',
  protectRoute,
  restrictTo('Admin'),
  attendanceController.markAttendance
);

export default router;
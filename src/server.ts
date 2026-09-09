import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.config';
import * as dotenv from 'dotenv';
import blogRoutes from './routes/blog.routes'
import memberRoutes from './routes/member.route'; // Import member routes
import projectRoutes from './routes/project.routes'; // Import project routes
import resourceRoutes from './routes/resource.routes';
import eventRoutes from './routes/event.routes';
import hubRoutes from './routes/hub.routes';
// import chatRoutes from './chat.routes';
import chatRoutes from './routes/chat.routes';
// import notificationRoutes from './notification.routes';
import notificationRoutes from './routes/notification.routes';
import hireRoutes from './routes/hire.route';
import adminHireRoutes from './routes/admin/hire.routes';
import adminHeroMembersRoutes from './routes/admin/heroMembers.routes';
import heroMembersRoutes from './routes/heroMembers.routes';
import applicationRoutes from './routes/application.routes';
import adminApplicationRoutes from './routes/admin/application.routes';
import adminHubVideoRoutes from './routes/admin/hubVideo.routes';
import hubVideoRoutes from './routes/hubVideo.routes';
import adminMemberRoutes from './routes/admin/member.routes';
import adminAlumnusRoutes from './routes/admin/alumnus.routes';
import alumniRoutes from './routes/alumni.routes';
import taskRoutes from './routes/task.routes';

// Load environment variables
dotenv.config();

// Import your routes
import userRoutes from './routes/user.route';
// Import other routes as needed

// Initialize Express app
const app: Express = express();

// Security middleware
const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow Swagger UI to work
  // HSTS and COOP were previously disabled unconditionally "for
  // development", which also silently weakened them in production - a
  // deployed API should tell browsers to always use HTTPS for this origin
  // (HSTS) and isolate its browsing context (COOP). Only actually disabled
  // outside production now, where they'd otherwise fight local HTTP dev
  // servers.
  hsts: isProduction,
  crossOriginOpenerPolicy: isProduction,
}));
// No CORS origin was configured at all before this, so the cors package's
// default reflects any requesting origin - any website could make
// authenticated cross-origin requests to this API from a browser holding a
// valid token. Restricted to the real frontend origin(s); FRONTEND_URL is
// already the app's own convention for "the deployed frontend" (used to
// build email links elsewhere) - CORS_ORIGINS can add more, comma-
// separated, for cases like a preview deployment alongside the main one.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()) ?? []),
  ...(isProduction ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
].filter((origin): origin is string => Boolean(origin));

if (allowedOrigins.length === 0) {
  // Almost certainly a missing FRONTEND_URL in this environment's config,
  // not an intentional "block everything" - warn loudly rather than fail
  // silently, since the symptom (every browser request blocked by CORS)
  // gives no indication server-side that this is the cause.
  console.warn(
    '[cors] No allowed origins configured (FRONTEND_URL/CORS_ORIGINS are unset) - ' +
    'every cross-origin browser request to this API will be rejected.'
  );
}

// Not using { credentials: true } - the app authenticates via a Bearer
// token (Authorization header, never cookies; confirmed no res.cookie/
// cookie-parser usage anywhere), so there's no session cookie that needs
// cross-origin credential support.
app.use(cors({
  origin: allowedOrigins,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API routes
//
// userRoutes used to also be mounted whole again at '/auth/google' and
// '/users' - every route inside it (including admin-only user management:
// delete a user, change a user's role, deactivate an account) was reachable
// a second and third time under those prefixes too. Each route still
// enforces its own protectRoute/restrictTo regardless of which prefix
// reached it, so this was never a bypass - just unnecessary extra surface
// area, and confusing: userRoutes' own comment already says the real
// Google-auth path is /api/users/auth/google/auth (this mount), and no
// frontend code (checked directly) calls anything through the other two.
app.use('/api/users', userRoutes);
// Routes
app.use('/api/blogs', blogRoutes);
app.use('/api/members', memberRoutes); // Mount member routes
app.use('/api/projects', projectRoutes); // Mount project routes
app.use('/api/resources', resourceRoutes); // Mount resource routes
app.use('/api/events', eventRoutes); // Mount event routes
app.use('/api/hub', hubRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/tasks', taskRoutes)   
// Public route
app.use('/api/hire-us', hireRoutes);
app.use('/api/hero-members', heroMembersRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/hub-video', hubVideoRoutes);
app.use('/api/alumni', alumniRoutes);

// Admin routes - already protected by middleware in the router
app.use('/api/admin/hire-inquiries', adminHireRoutes);
app.use('/api/admin/applications', adminApplicationRoutes);
app.use('/api/admin/hub-video', adminHubVideoRoutes);
app.use('/api/admin/members', adminMemberRoutes);
app.use('/api/admin/alumni', adminAlumnusRoutes);
// Mounted broadly at /api/admin since this router covers two related
// admin-only concerns (the member picker and hero-member CRUD) under their
// own more specific sub-paths (/members/picker, /hero-members*) - it only
// intercepts requests matching those, everything else falls through.
app.use('/api/admin', adminHeroMembersRoutes);

// Add Swagger UI middleware
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Simple health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Default 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Export app for testing purposes
export { app };



import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.config';
import { Sequelize } from 'sequelize'; // Add this import
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
import taskRoutes from './routes/task.routes';

// Load environment variables
dotenv.config();

// Import your routes
import userRoutes from './routes/user.route';
// Import other routes as needed

// Initialize Express app
const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API routes
app.use('/api/users', userRoutes);
app.use('/auth/google', userRoutes);
// Routes
app.use('/api/blogs', blogRoutes);
app.use('/api/members', memberRoutes); // Mount member routes
app.use('/api/projects', projectRoutes); // Mount project routes
app.use('/api/resources', resourceRoutes); // Mount resource routes
app.use('/api/events', eventRoutes); // Mount event routes
app.use('/users', userRoutes);
app.use('/api/hub', hubRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/tasks', taskRoutes)
// Public route
app.use('/api/hire-us', hireRoutes);

// Admin routes - already protected by middleware in the router
app.use('/api/admin/hire-inquiries', adminHireRoutes);
 
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



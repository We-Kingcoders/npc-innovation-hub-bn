import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
// import config from './config/app.config';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.config';

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

// Add Swagger UI middleware BEFORE the 404 handler
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Simple health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Default 404 handler - this should be AFTER all your routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

export { app };
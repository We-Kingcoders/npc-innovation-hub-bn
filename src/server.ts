import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.config';
import { Sequelize } from 'sequelize'; // Add this import
import * as dotenv from 'dotenv';
import blogRoutes from './routes/blog.routes'
// Load environment variables
dotenv.config();

// Import your routes
import userRoutes from './routes/user.route';
// Import other routes as needed

// Initialize Express app
const app: Express = express();

// Initialize Sequelize
const env = process.env.NODE_ENV || 'development';
const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USERNAME as string,
  process.env.DB_PASSWORD as string,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    schema: 'public', // Explicitly set schema
  }
);

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
// Routes
app.use('/api/blogs', blogRoutes)


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

// Start the server with database sync
if (require.main === module) {
  // This block only runs when the file is executed directly (not imported)
  const PORT = process.env.PORT || 5000;

  // Force sync database tables
  sequelize.sync({ force: true })
    .then(() => {
      console.log('Database tables created successfully!');
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      });
    })
    .catch(err => {
      console.error('Error syncing database:', err);
    });
}
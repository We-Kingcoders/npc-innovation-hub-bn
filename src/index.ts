import { app } from './server';
import http from 'http';
import config from './config/app.config';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.config';
import sequelize from './config/database';  // Import your sequelize instance

// Set up Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Create HTTP server
const server = http.createServer(app);

// Port
const PORT = config.app.port;

// Initialize database and start server
const startServer = async () => {
  console.log('Initializing database...');
  
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models
    await sequelize.sync({ force: false });
    console.log('All database tables created successfully.');
    
    // Start server after database is ready
  server.listen(5000, '0.0.0.0', () => {
    console.log('Server is running on port 5000');
});
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});
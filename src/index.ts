import { app } from './server';
import http from 'http';
import config from './config/app.config';
import sequelize from './config/database';  // Import your sequelize instance
import { initSocket } from './socketio';

// Note: Swagger UI is already mounted at /api-docs inside server.ts, before
// its catch-all 404 handler. Re-mounting it here would land after that 404
// handler in the middleware stack and never be reached, so it isn't repeated.

// Create HTTP server
// eslint-disable-next-line @typescript-eslint/no-misused-promises -- standard Express+http bootstrap; Express 5's handler types admit a Promise return, which trips this rule even though http.createServer never awaits its listener's result either way.
const server = http.createServer(app);

// Attach Socket.IO (chat + real-time notifications) to the same HTTP server
initSocket(server);

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
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

// Start the server (startServer's own try/catch handles all failures, incl.
// process.exit(1), so it can never actually reject here)
void startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});
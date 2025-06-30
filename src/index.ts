import { app } from './server';
import http from 'http';
import config from './config/app.config';

// Create HTTP server
const server = http.createServer(app);

// Port
const PORT = config.app.port;

// Start server
server.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  🔗 Health check: http://localhost:${PORT}/health
  `);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});
import express from 'express';
import http from 'http';
import userRoutes from "./routes/user.route";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register API routes
app.use("/api/users", userRoutes);

// Add a simple test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Innovation Hub API is running',
    timestamp: '2025-07-01 20:50:41'
  });
});

// Port
const PORT = process.env.PORT || 5000;

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, server };
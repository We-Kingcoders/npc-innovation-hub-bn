import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Current time info from your system
const currentTime = "2025-07-01 14:58:06";
const currentUser = "Alain275";

dotenv.config(); // Load env variables

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

// Simple logging using console
console.log(`[${currentTime}] Cloudinary configured by: ${currentUser}`);

// Enhanced cloudinary object with extra utility functions
const cloudinaryUtils = {
  // Original cloudinary object
  ...cloudinary,
  
  // Standard options for innovation hub uploads
  hubOptions: {
    folder: 'innovation-hub',
    resource_type: 'auto',
    overwrite: true
  },
  
  // Helper method for innovation hub uploads
  async uploadToHub(filePath: string, customOptions = {}) {
    try {
      return await cloudinary.uploader.upload(filePath, {
        ...this.hubOptions,
        ...customOptions
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }
};

export default cloudinaryUtils;
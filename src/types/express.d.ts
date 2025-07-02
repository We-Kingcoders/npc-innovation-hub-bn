// Create this file in your project (if it doesn't exist)
import { UserAttributes } from './user.type';

declare global {
  namespace Express {
    interface Request {
      user?: UserAttributes; // Use your existing User type
    }
  }
}
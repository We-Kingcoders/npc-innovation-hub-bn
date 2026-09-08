import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { isBlacklisted } from '../utils/tokenBlacklist'
import { UserAttributes } from '../types/user.type'

// Remove this interface since we're using the global namespace extension
// interface AuthenticatedRequest extends Request {
//   user?: {
//     role: string;
//     [key: string]: any;
//   };
// }

// Keep the global namespace declaration
declare global {
  namespace Express {
    // Merge with the existing user property type. Must stay an `interface`
    // (not `type`) even though it declares no members of its own -
    // @types/passport separately declares its own `Express.User` interface,
    // and only `interface` declarations can merge across those two sites;
    // a `type` alias here collides with passport's as a duplicate identifier.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserAttributes {}
  }
}

export const protectRoute = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.headers.authorization) {
      res.status(401).json({ message: 'Authorization header missing' })
      return // Stop execution after sending the response
    }

    const token = req.headers.authorization.split(' ')[1]
    const jwt_secret: string | undefined = process.env.JWT_SECRET
    if (!jwt_secret) {
      res.status(500).json({ message: 'JWT_SECRET is missing' })
      return
    }

    if (isBlacklisted(token)) {
      res.status(401).json({
        status: 'error',
        message: 'Token has been invalidated.',
      })
      return
    }

    jwt.verify(token, jwt_secret, (err, decoded) => {
      if (err) {
        res.status(401).json({ message: 'Unauthorized request, Try again' })
      } else {
        // Ensure decoded has the required structure with non-optional role
        req.user = decoded as UserAttributes
        next() // Move to the next middleware
      }
    })
  } catch (err) {
    console.error('Error occurred:', err)
    res.status(500).json({ message: 'Internal Server Error' })
  }
}

// Use the standard Request type, as it has been extended in the global namespace
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Ensure role is defined before attempting to use it
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({
        message: 'You are not authorized to perform this action',
      });
      return;
    }

    next(); // Proceed if user has the required role
  };
};
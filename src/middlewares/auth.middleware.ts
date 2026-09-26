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

// For routes that must work for BOTH anonymous and authenticated callers
// (the NPC AI Assistant) - attaches req.user when a valid, non-
// blacklisted token is present, but NEVER rejects the request otherwise.
//
// This must never call res.status(401) on any path, full stop - unlike
// every other auth middleware in this app. The frontend's shared axios
// client (src/api/client.ts) treats ANY 401 from ANY endpoint as "clear
// the token and hard-redirect to /login" - if this middleware ever 401'd
// on a stale/malformed token, a real logged-in user would be silently
// logged out of their whole session just for typing into the chat
// widget. Every failure path here - missing header, missing JWT_SECRET,
// blacklisted token, invalid/expired token - falls through to next()
// with req.user left undefined, i.e. treated as anonymous.
export const attachUserIfPresent = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next()
      return
    }

    const token = authHeader.split(' ')[1]
    const jwt_secret: string | undefined = process.env.JWT_SECRET
    if (!token || !jwt_secret) {
      next()
      return
    }

    if (isBlacklisted(token)) {
      next()
      return
    }

    jwt.verify(token, jwt_secret, (err, decoded) => {
      if (err || !decoded) {
        next()
        return
      }
      req.user = decoded as UserAttributes
      next()
    })
  } catch (err) {
    console.error('attachUserIfPresent error (proceeding as anonymous):', err)
    next()
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
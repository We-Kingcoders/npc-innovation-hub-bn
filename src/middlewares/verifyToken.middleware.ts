import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { errorResponse } from '../utils/response.utils'
import { USER_MESSAGES, JWT_CONSTANTS } from '../utils/variable.utils'

export const getTokenFromRequest = (req: Request): string | null => {
  if (req.query.token) {
    return req.query.token as string
  }
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return req.headers.authorization.split(' ')[1]
  }
  if (req.body.token) {
    return req.body.token
  }
  return null
}

export const verifyTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const token = getTokenFromRequest(req)

  if (!token) {
    errorResponse(res, 400, USER_MESSAGES.INVALID_TOKEN)
    return 
  }

  try {
    const decoded = jwt.verify(
      token,
      JWT_CONSTANTS.SECRET_KEY,
    ) as jwt.JwtPayload // Cast to JwtPayload
    ;(req as any).decoded = decoded // Attach the decoded token to the request object
    next() // Call the next middleware
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      errorResponse(res, 400, USER_MESSAGES.INVALID_TOKEN)
      return 
    }
    errorResponse(res, 500, USER_MESSAGES.INTERNAL_SERVER_ERROR)
    return 
  }
}
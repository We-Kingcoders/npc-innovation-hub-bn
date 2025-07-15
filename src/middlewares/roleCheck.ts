import { Request, Response, NextFunction } from 'express'

// Call as roleCheck(['Admin']) or roleCheck(['Member'])
export function roleCheck(roles: Array<'Admin' | 'Member'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user // Assume your auth middleware attaches the user object
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    next()
  }
}
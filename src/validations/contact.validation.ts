import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'

// Hire Us's equivalent public endpoint validates inline in the controller
// with no Joi schema at all - this one uses Joi instead (matching the
// house style Joi *is* used for elsewhere, e.g. heroMedia.validation.ts),
// since a public, unauthenticated, email-triggering endpoint is exactly
// the kind of input that deserves a real schema rather than a manual
// truthy-check.
const contactMessageSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150).required().messages({
    'string.empty': 'Name is required',
    'string.max': 'Name must be 150 characters or fewer',
    'any.required': 'Name is required',
  }),
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  message: Joi.string().trim().min(1).max(5000).required().messages({
    'string.empty': 'Message is required',
    'string.max': 'Message must be 5000 characters or fewer',
    'any.required': 'Message is required',
  }),
})

export const validateContactMessage = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = contactMessageSchema.validate(req.body, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }

  req.body = value
  next()
}

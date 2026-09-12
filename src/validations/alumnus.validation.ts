import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'

// Alumni are standalone display-only records (no platform account, no
// member profile behind them) - unlike a Member's own role, which is
// still restricted to MEMBER_SPECIALIZATIONS elsewhere in this file,
// an alumnus's role is free text. The admin UI's "Other" option needs
// somewhere to actually save what's typed instead of every custom title
// being rejected as not one of the fixed specializations.
const alumnusCreateSchema = Joi.object({
  fullName: Joi.string().trim().min(1).required().messages({
    'any.required': 'fullName is required',
    'string.empty': 'fullName is required',
  }),
  role: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'role is required',
    'string.empty': 'role is required',
    'string.max': 'role must be 100 characters or fewer',
  }),
}).unknown(true)

export const validateAlumnusCreate = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = alumnusCreateSchema.validate(req.body || {}, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

const alumnusUpdateSchema = Joi.object({
  fullName: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'fullName cannot be empty',
  }),
  role: Joi.string().trim().min(1).max(100).optional().messages({
    'string.empty': 'role cannot be empty',
    'string.max': 'role must be 100 characters or fewer',
  }),
}).unknown(true)

export const validateAlumnusUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = alumnusUpdateSchema.validate(req.body || {}, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

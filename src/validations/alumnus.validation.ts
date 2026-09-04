import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { MEMBER_SPECIALIZATIONS } from './member.validation'

const alumnusCreateSchema = Joi.object({
  fullName: Joi.string().trim().min(1).required().messages({
    'any.required': 'fullName is required',
    'string.empty': 'fullName is required',
  }),
  role: Joi.string().valid(...MEMBER_SPECIALIZATIONS).required().messages({
    'any.only': `role must be one of: ${MEMBER_SPECIALIZATIONS.join(', ')}`,
    'any.required': 'role is required',
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
  role: Joi.string().valid(...MEMBER_SPECIALIZATIONS).optional().messages({
    'any.only': `role must be one of: ${MEMBER_SPECIALIZATIONS.join(', ')}`,
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

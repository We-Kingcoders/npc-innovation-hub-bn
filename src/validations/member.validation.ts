import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'

const idParamSchema = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4'] }).required().messages({
    'string.guid': 'Member id must be a valid UUID',
    'any.required': 'Member id is required',
  }),
})

const userIdParamSchema = Joi.object({
  userId: Joi.string().guid({ version: ['uuidv4'] }).required().messages({
    'string.guid': 'userId must be a valid UUID',
    'any.required': 'userId is required',
  }),
})

const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().messages({
    'number.base': 'page must be a positive integer',
    'number.integer': 'page must be a positive integer',
    'number.min': 'page must be a positive integer',
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    'number.base': 'limit must be a positive integer between 1 and 100',
    'number.integer': 'limit must be a positive integer between 1 and 100',
    'number.min': 'limit must be a positive integer between 1 and 100',
    'number.max': 'limit must be a positive integer between 1 and 100',
  }),
}).unknown(true)

export const validateMemberIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = idParamSchema.validate(req.params, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

export const validateUserIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = userIdParamSchema.validate(req.params, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

export const validatePaginationQuery = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = paginationQuerySchema.validate(req.query, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

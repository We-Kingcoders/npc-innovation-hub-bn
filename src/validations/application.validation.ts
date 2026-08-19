import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'

const GENDERS = ['Male', 'Female', 'Other'] as const

const applicationSchema = Joi.object({
  fullName: Joi.string().trim().min(1).required().messages({
    'any.required': 'fullName is required',
    'string.empty': 'fullName is required',
  }),
  email: Joi.string().email({ minDomainSegments: 2 }).required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'email is required',
  }),
  githubUrl: Joi.string().uri({ scheme: ['http', 'https'] }).required().messages({
    'string.uri': 'githubUrl must be a valid URL',
    'any.required': 'githubUrl is required',
  }),
  skills: Joi.array().items(Joi.string().trim().min(1)).min(1).required().messages({
    'array.base': 'skills must be an array of strings',
    'array.min': 'skills must contain at least one entry',
    'any.required': 'skills is required',
  }),
  phoneNumber: Joi.string().trim().min(1).required().messages({
    'any.required': 'phoneNumber is required',
    'string.empty': 'phoneNumber is required',
  }),
  gender: Joi.string().valid(...GENDERS).required().messages({
    'any.only': `gender must be one of: ${GENDERS.join(', ')}`,
    'any.required': 'gender is required',
  }),
  strengths: Joi.string().trim().min(1).required().messages({
    'any.required': 'strengths is required',
    'string.empty': 'strengths is required',
  }),
  weaknesses: Joi.string().trim().min(1).required().messages({
    'any.required': 'weaknesses is required',
    'string.empty': 'weaknesses is required',
  }),
}).unknown(true)

function parseJsonArrayInput(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

export const validateApplicationSubmission = (req: Request, res: Response, next: NextFunction): void => {
  const candidate: Record<string, unknown> = { ...req.body }
  if ('skills' in candidate) {
    candidate.skills = parseJsonArrayInput(candidate.skills)
  }

  const { error, value } = applicationSchema.validate(candidate, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }

  req.body.skills = value.skills

  next()
}

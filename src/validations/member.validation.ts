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

export const SKILL_CATEGORIES = [
  'Frontend Development',
  'Backend Development',
  'DevOps & Tools',
  'Mobile & Other',
  'Other',
] as const

const skillDetailSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    'any.required': 'Each skill entry requires a name',
    'string.empty': 'Each skill entry requires a name',
  }),
  technologies: Joi.array().items(Joi.string()).required().messages({
    'any.required': 'Each skill entry requires a technologies array',
  }),
  percent: Joi.number().min(0).max(100).required().messages({
    'any.required': 'Each skill entry requires a percent',
    'number.min': 'percent must be between 0 and 100',
    'number.max': 'percent must be between 0 and 100',
  }),
  category: Joi.string().valid(...SKILL_CATEGORIES).optional().messages({
    'any.only': `category must be one of: ${SKILL_CATEGORIES.join(', ')}`,
  }),
}).unknown(true)

const skillsUpdateBodySchema = Joi.object({
  skillDetails: Joi.array().items(skillDetailSchema).required().messages({
    'any.required': 'skillDetails is required',
    'array.base': 'skillDetails must be an array',
  }),
}).unknown(true)

export const validateSkillsUpdateBody = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = skillsUpdateBodySchema.validate(req.body, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

const LANGUAGE_LEVELS = ['Native', 'Fluent', 'Intermediate', 'Basic'] as const

const languageSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    'any.required': 'Each language entry requires a name',
    'string.empty': 'Each language entry requires a name',
  }),
  level: Joi.string().valid(...LANGUAGE_LEVELS).required().messages({
    'any.only': `level must be one of: ${LANGUAGE_LEVELS.join(', ')}`,
    'any.required': 'Each language entry requires a level',
  }),
})

const memberUpdateBodySchema = Joi.object({
  name: Joi.string().optional(),
  role: Joi.string().optional(),
  bio: Joi.string().allow('').optional(),
  tagline: Joi.string().trim().max(160).allow('', null).optional().messages({
    'string.max': 'tagline must be at most 160 characters',
  }),
  availability: Joi.boolean().optional().messages({
    'boolean.base': 'availability must be a boolean',
  }),
  languages: Joi.array().items(languageSchema).optional().messages({
    'array.base': 'languages must be an array',
  }),
}).unknown(true)

function parseLanguagesInput(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

export const validateMemberUpdateBody = (req: Request, res: Response, next: NextFunction): void => {
  const candidate: Record<string, unknown> = { ...req.body }
  if ('languages' in candidate) {
    candidate.languages = parseLanguagesInput(candidate.languages)
  }

  const { error, value } = memberUpdateBodySchema.validate(candidate, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }

  // Write back normalized/coerced values (parsed languages, coerced availability boolean)
  // so the controller can read req.body directly without re-parsing.
  if ('languages' in value) req.body.languages = value.languages
  if ('availability' in value) req.body.availability = value.availability
  if ('tagline' in value) req.body.tagline = value.tagline

  next()
}

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

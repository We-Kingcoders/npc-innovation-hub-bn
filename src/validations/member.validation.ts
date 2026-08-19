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

const MAX_HASHTAGS = 6

const hashtagSchema = Joi.string().trim().min(1).max(30).messages({
  'string.max': 'each hashtag must be at most 30 characters',
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
  hashtags: Joi.array().items(hashtagSchema).max(MAX_HASHTAGS).optional().messages({
    'array.base': 'hashtags must be an array',
    'array.max': `hashtags cannot have more than ${MAX_HASHTAGS} entries`,
  }),
}).unknown(true)

// Multipart form-data always sends array/object fields as JSON-encoded
// strings; parse them back before Joi validates their shape.
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

export const validateMemberUpdateBody = (req: Request, res: Response, next: NextFunction): void => {
  const candidate: Record<string, unknown> = { ...req.body }
  if ('languages' in candidate) {
    candidate.languages = parseJsonArrayInput(candidate.languages)
  }
  if ('hashtags' in candidate) {
    candidate.hashtags = parseJsonArrayInput(candidate.hashtags)
  }

  const { error, value } = memberUpdateBodySchema.validate(candidate, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }

  // Write back normalized/coerced values (parsed languages/hashtags, coerced
  // availability boolean) so the controller can read req.body directly
  // without re-parsing.
  if ('languages' in value) req.body.languages = value.languages
  if ('hashtags' in value) req.body.hashtags = value.hashtags
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

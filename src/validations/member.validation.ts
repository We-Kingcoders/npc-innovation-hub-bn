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

// Member.role is a plain string column with no DB-level enum (confirmed by
// reading member.model.ts before adding this). It is NOT constrained at the
// database level here: the existing default fallback used to be the literal
// string 'Member' (not a specialization), so real/existing rows are likely to
// already hold values outside this list. Validating only at the Joi layer
// avoids breaking writes for that already-existing data.
export const MEMBER_SPECIALIZATIONS = [
  'Frontend Developer',
  'Backend Developer',
  'Full-Stack Developer',
  'Database Specialist',
  'Cybersecurity Specialist',
  'Network Administrator',
  'DevOps Engineer',
  'Mobile Developer',
  'UI/UX Designer',
  'Other',
] as const

export const EDUCATION_STATUSES = ['Currently Enrolled', 'Graduated', 'On Leave', 'Other'] as const

const alumniStatusUpdateSchema = Joi.object({
  isAlumni: Joi.boolean().required().messages({
    'any.required': 'isAlumni is required',
    'boolean.base': 'isAlumni must be true or false',
  }),
})

export const validateAlumniStatusUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = alumniStatusUpdateSchema.validate(req.body || {}, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }

  req.body.isAlumni = value.isAlumni
  next()
}

const currentYear = new Date().getFullYear()

const educationUpdateBodySchema = Joi.object({
  degree: Joi.string().optional(),
  institution: Joi.string().optional(),
  department: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  startYear: Joi.number().integer().min(1950).max(currentYear + 1).optional().messages({
    'number.min': 'startYear must be 1950 or later',
    'number.max': `startYear cannot be later than ${currentYear + 1}`,
  }),
  // null means "Present" (still ongoing)
  endYear: Joi.number().integer().min(1950).max(currentYear + 10).allow(null).optional().messages({
    'number.min': 'endYear must be 1950 or later',
    'number.max': `endYear cannot be later than ${currentYear + 10}`,
  }),
  status: Joi.string().valid(...EDUCATION_STATUSES).optional().messages({
    'any.only': `status must be one of: ${EDUCATION_STATUSES.join(', ')}`,
  }),
}).unknown(true)

export const validateEducationUpdateBody = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = educationUpdateBodySchema.validate(req.body, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }

  // Write back coerced numeric year values.
  if ('startYear' in value) req.body.startYear = value.startYear
  if ('endYear' in value) req.body.endYear = value.endYear

  next()
}

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

const MAX_HASHTAGS = 6

const hashtagSchema = Joi.string().trim().min(1).max(30).messages({
  'string.max': 'each hashtag must be at most 30 characters',
})

const memberUpdateBodySchema = Joi.object({
  name: Joi.string().optional(),
  role: Joi.string().valid(...MEMBER_SPECIALIZATIONS).optional().messages({
    'any.only': `role must be one of: ${MEMBER_SPECIALIZATIONS.join(', ')}`,
  }),
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

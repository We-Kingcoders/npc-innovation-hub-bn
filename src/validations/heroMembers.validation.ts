import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'

const addHeroMemberSchema = Joi.object({
  memberId: Joi.string().guid({ version: ['uuidv4'] }).required().messages({
    'string.guid': 'memberId must be a valid UUID',
    'any.required': 'memberId is required',
  }),
})

export const validateAddHeroMember = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = addHeroMemberSchema.validate(req.body, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

const heroMemberIdParamSchema = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4'] }).required().messages({
    'string.guid': 'id must be a valid UUID',
    'any.required': 'id is required',
  }),
})

export const validateHeroMemberIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = heroMemberIdParamSchema.validate(req.params, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

// The reorder request body is the ordered array of HeroFeaturedMember ids
// itself, not wrapped in an object.
const reorderHeroMembersSchema = Joi.array()
  .items(
    Joi.string().guid({ version: ['uuidv4'] }).messages({
      'string.guid': 'Each id in the reorder list must be a valid UUID',
    })
  )
  .min(1)
  .required()
  .messages({
    'array.base': 'Request body must be an array of HeroFeaturedMember ids',
    'array.min': 'Request body must contain at least one id',
    'any.required': 'Request body must be an array of HeroFeaturedMember ids',
  })

export const validateReorderHeroMembers = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = reorderHeroMembersSchema.validate(req.body, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

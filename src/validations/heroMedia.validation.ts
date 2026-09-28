import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'

// Metadata accompanying a multipart upload - the file itself is handled by
// multer/fileFilter, not Joi. .unknown(true) since req.body also carries
// whatever multer leaves alongside the parsed fields.
const heroMediaUploadSchema = Joi.object({
  title: Joi.string().trim().max(200).allow('', null).optional(),
  altText: Joi.string().trim().max(300).allow('', null).optional(),
  caption: Joi.string().trim().max(500).allow('', null).optional(),
}).unknown(true)

export const validateHeroMediaUpload = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = heroMediaUploadSchema.validate(req.body || {}, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }

  req.body.title = value.title || null
  req.body.altText = value.altText || null
  req.body.caption = value.caption || null

  next()
}

const updateHeroMediaMetadataSchema = Joi.object({
  title: Joi.string().trim().max(200).allow('', null).optional(),
  altText: Joi.string().trim().max(300).allow('', null).optional(),
  caption: Joi.string().trim().max(500).allow('', null).optional(),
}).min(1)

export const validateUpdateHeroMediaMetadata = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = updateHeroMediaMetadataSchema.validate(req.body, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

const heroMediaIdParamSchema = Joi.object({
  id: Joi.string().guid({ version: ['uuidv4'] }).required().messages({
    'string.guid': 'id must be a valid UUID',
    'any.required': 'id is required',
  }),
})

export const validateHeroMediaIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = heroMediaIdParamSchema.validate(req.params, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

// The reorder request body is the ordered array of HeroMedia ids itself,
// not wrapped in an object - same shape as reorderHeroMembers.
const reorderHeroMediaSchema = Joi.array()
  .items(
    Joi.string().guid({ version: ['uuidv4'] }).messages({
      'string.guid': 'Each id in the reorder list must be a valid UUID',
    })
  )
  .min(1)
  .required()
  .messages({
    'array.base': 'Request body must be an array of HeroMedia ids',
    'array.min': 'Request body must contain at least one id',
    'any.required': 'Request body must be an array of HeroMedia ids',
  })

export const validateReorderHeroMedia = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = reorderHeroMediaSchema.validate(req.body, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }
  next()
}

import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'

const hubVideoUploadSchema = Joi.object({
  title: Joi.string().trim().max(200).allow('', null).optional(),
  description: Joi.string().trim().max(2000).allow('', null).optional(),
}).unknown(true)

export const validateHubVideoUpload = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = hubVideoUploadSchema.validate(req.body || {}, { abortEarly: false })
  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }

  req.body.title = value.title || null
  req.body.description = value.description || null

  next()
}

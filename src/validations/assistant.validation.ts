import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { AI_CONFIG } from '../config/ai.config'

const historyTurnSchema = Joi.object({
  role: Joi.string().valid('user', 'assistant').required(),
  content: Joi.string().max(AI_CONFIG.maxMessageLength).allow('').required(),
})

const chatRequestSchema = Joi.object({
  message: Joi.string().trim().min(1).max(AI_CONFIG.maxMessageLength).required().messages({
    'string.empty': 'Message is required',
    'string.max': `Message must be ${AI_CONFIG.maxMessageLength} characters or fewer`,
    'any.required': 'Message is required',
  }),
  conversationId: Joi.string().max(100).optional(),
  // Capped generously above the server's own AI_MAX_HISTORY_MESSAGES -
  // the orchestrator truncates to the real cap regardless, this just
  // bounds how much a single request body can contain before that.
  history: Joi.array().items(historyTurnSchema).max(50).optional(),
  language: Joi.string().valid('en', 'rw', 'fr', 'sw').optional(),
})

export const validateChatRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { error } = chatRequestSchema.validate(req.body, { abortEarly: false })

  if (error) {
    res.status(400).json({
      status: 'fail',
      message: error.details.map((detail) => detail.message).join(', '),
    })
    return
  }

  next()
}

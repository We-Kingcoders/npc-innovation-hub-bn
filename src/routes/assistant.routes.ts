import express from 'express'
import { attachUserIfPresent } from '../middlewares/auth.middleware'
import { assistantChatLimiter, assistantDailyLimiter } from '../middlewares/rateLimit.middleware'
import { validateChatRequest } from '../validations/assistant.validation'
import { chat } from '../controllers/assistant.controller'

const assistantRoutes = express.Router()

// attachUserIfPresent MUST run before the rate limiters - they key by
// req.user.id when present, which doesn't exist until this middleware
// has run. This is the opposite order from every other limiter in this
// app (login/signup precede authentication by definition); see
// rateLimit.middleware.ts's comment on assistantChatLimiter for why.
assistantRoutes.post(
  '/chat',
  attachUserIfPresent,
  assistantChatLimiter,
  assistantDailyLimiter,
  validateChatRequest,
  chat,
)

export default assistantRoutes

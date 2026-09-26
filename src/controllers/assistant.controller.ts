import { Request, Response } from 'express'
import { handleChatMessage, type ChatFailure } from '../services/assistant/chatOrchestrator.service'

// This controller owns its own try/catch and error mapping - the app's
// globalErrorHandler (server.ts) is a last-resort net returning one
// generic message, not a categorized mapper, and every other controller
// in this codebase handles its own errors the same way this one does.
const FRIENDLY_MESSAGES: Record<ChatFailure['category'], { status: number; message: string }> = {
  unauthorized: { status: 502, message: 'The assistant is temporarily unavailable. Please try again shortly.' },
  rate_limited: { status: 502, message: 'The assistant is receiving a lot of requests right now. Please try again in a moment.' },
  invalid_request: { status: 502, message: 'The assistant could not process that request. Please try rephrasing your question.' },
  timeout: { status: 504, message: 'The assistant is taking longer than expected. Please try again shortly.' },
  network_error: { status: 502, message: 'Connection problem reaching the assistant. Please check your connection and try again.' },
  provider_error: { status: 502, message: 'The assistant is temporarily unavailable. Please try again shortly.' },
  unknown: { status: 500, message: 'Something went wrong. Please try again.' },
}

export const chat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, conversationId, history, language } = req.body as {
      message: string
      conversationId?: string
      history?: { role: 'user' | 'assistant'; content: string }[]
      language?: string
    }

    // req.user comes from attachUserIfPresent (verified JWT or
    // undefined) - never from anything in req.body. A client cannot make
    // itself "authenticated" by sending a role/userId field.
    const user = req.user?.id ? { id: req.user.id, role: req.user.role } : undefined

    const result = await handleChatMessage({ message, conversationId, history, language }, user)

    if (!result.ok) {
      const { status, message: friendlyMessage } = FRIENDLY_MESSAGES[result.category]
      res.status(status).json({ success: false, message: friendlyMessage })
      return
    }

    res.status(200).json({
      success: true,
      data: {
        message: result.message,
        conversationId: result.conversationId,
        language: result.language,
      },
    })
  } catch (error) {
    console.error('Unexpected error in assistant chat controller:', error)
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
  }
}

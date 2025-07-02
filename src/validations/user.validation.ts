import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { UserService } from '../services/user.services'

const usersValidation = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net','org','info', 'biz', 'gov', 'edu', 'co', 'rw'] } })
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email address is required',
    }),
  password: Joi.string()
    .pattern(
      new RegExp(
        '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
      ),
    )
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain at least one lowercase letter, one uppercase letter, one digit, one special character, and be at least 8 characters long.',
      'any.required': 'Password is required.',
    }),
  firstName: Joi.string().min(3).max(20).required().messages({
    'string.min': 'First name must be at least 3 characters long',
    'string.max': 'First name cannot exceed 20 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(3).max(20).required().messages({
    'string.min': 'Last name must be at least 3 characters long',
    'string.max': 'Last name cannot exceed 20 characters',
    'any.required': 'Last name is required',
  }),
  role: Joi.string()
    .valid('Admin', 'Member') // Updated to match the model's allowed roles
    .optional() // Made optional since the model has a default value
    .messages({
      'any.only': 'Role must be either Admin or Member',
    }),
  gender: Joi.string().valid('male', 'female', 'other').optional().messages({
    'any.only': 'Gender must be male, female, or other',
  }), 
  phone: Joi.string()
    .trim()
    .regex(/^\+[1-9]\d{1,14}$/)
    .optional() // Made optional to match the model
    .messages({
      'string.pattern.base':
        "Please enter a valid phone number in international format starting with '+' with country code",
    }),
  image: Joi.string().optional(), // Added to match the model
})

export const validateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Log validation attempt
  console.log(`Validation attempt at: ${new Date().toISOString()} by ${req.ip}`);
  
  const { error } = usersValidation.validate(req.body, { abortEarly: false })

  // If there's a validation error, return a 400 response
  if (error) {
    res.status(400).json({
      status: 'fail',
      data: {
        message: error.details.map((detail) => detail.message).join(', '),
      },
    })
    return
  }

  const { email } = req.body

  // Check if email is provided
  if (!email) {
    res.status(400).json({
      status: 'fail',
      message: 'Email address is required',
    })
    return
  }

  try {
    // Fetch user by email
    const user = await UserService.getUserByEmail(email)

    // If user exists, return a 409 conflict response
    if (user) {
      res.status(409).json({
        status: 'fail',
        message: 'User already exists. Please login instead',
      })
      return
    }

    // If no user exists, move to the next middleware
    next()
  } catch (err) {
    console.error(`Validation error at ${new Date().toISOString()}:`, err);
    // Handle any errors by passing them to the next error handler
    next(err)
  }
}

const loginValidation = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net','org','info', 'biz', 'gov', 'edu', 'co', 'rw'] } })
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email address is required',
    }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required.',
  }),
})

export const validateUserLogin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Log login validation attempt
  console.log(`Login validation attempt at: ${new Date().toISOString()} for IP: ${req.ip}`);
  
  const { error } = loginValidation.validate(req.body, { abortEarly: false })

  if (error) {
    res.status(400).json({
      status: 'fail',
      data: {
        message: error.details.map((detail) => detail.message).join(', '),
      },
    })
    return
  }

  next()
}

const updatePasswordValidation = Joi.object({
  oldPassword: Joi.string().required().messages({
    'any.required': 'Old Password is required.',
  }),
  newPassword: Joi.string()
    .pattern(
      new RegExp(
        '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
      ),
    )
    .required()
    .messages({
      'string.pattern.base':
        'New password must contain at least one lowercase letter, one uppercase letter, one digit, one special character, and be at least 8 characters long.',
      'any.required': 'New password is required.',
    }),
})

export const validateUserUpdatePassword = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Log password update attempt
  console.log(`Password update validation attempt at: ${new Date().toISOString()}`);
  
  const { error } = updatePasswordValidation.validate(req.body, {
    abortEarly: false,
  })

  if (error) {
    res.status(400).json({
      status: 'fail',
      data: {
        message: error.details.map((detail) => detail.message).join(', '),
      },
    })
    return
  }

  next()
}
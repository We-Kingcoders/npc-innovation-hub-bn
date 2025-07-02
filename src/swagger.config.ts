import swaggerJsdoc from "swagger-jsdoc";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 5000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Innovation Hub API Documentation',
      version: '1.0.0',
      description: 'API documentation for Innovation Hub platform',
      contact: {
        name: 'Alain275',
        email: 'support@innovationhub.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server',
      },
      {
        url: 'https://innovation-hub-api.onrender.com',
        description: 'Production server (HTTPS)',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Profile',
        description: 'User profile management endpoints'
      },
      {
        name: 'Admin',
        description: 'Admin-only endpoints'
      },
      {
        name: 'System',
        description: 'System health and monitoring endpoints'
      },// Add this to your existing tags array
{
        name: 'Blogs',
        description: 'Blog management endpoints'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            phone: {
              type: 'string',
              description: 'User phone number in international format'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              description: 'User gender'
            },
            role: {
              type: 'string',
              enum: ['Admin', 'Member'],
              description: 'User role'
            },
            image: {
              type: 'string',
              format: 'uri',
              description: 'URL to user profile image'
            },
            verified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            isActive: {
              type: 'boolean',
              description: 'Account active status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp'
            },// Add this to your existing schemas in components.schemas
              Blog: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    description: 'Blog unique identifier'
                  },
                  title: {
                    type: 'string',
                    description: 'Blog title'
                  },
                  content: {
                    type: 'string',
                    description: 'Blog content (HTML/markdown formatted)'
                  },
                  summary: {
                    type: 'string',
                    description: 'Blog summary/excerpt'
                  },
                  image: {
                    type: 'string',
                    format: 'uri',
                    description: 'URL to blog featured image'
                  },
                  category: {
                    type: 'string',
                    enum: ['Cyber security', 'Front-end', 'Back-end'],
                    description: 'Blog category'
                  },
                  authorId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'ID of the blog author'
                  },
                  isPublished: {
                    type: 'boolean',
                    description: 'Publication status of the blog'
                  },
                  viewCount: {
                    type: 'integer',
                    description: 'Number of times the blog has been viewed'
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Blog creation timestamp'
                  },
                  updatedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Blog last update timestamp'
                  }
                }
              }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'fail'
            },
            message: {
              type: 'string'
            }
          }
        }
      }
    },
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          description: 'Check if the API is running correctly',
          tags: ['System'],
          security: [],
          responses: {
            200: {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'ok'
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        example: '2025-07-01T22:02:47Z'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/signup': {
        post: {
          summary: 'Register a new user',
          description: 'Creates a new user account and sends a verification email',
          tags: ['Authentication'],
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['firstName', 'lastName', 'email', 'password'],
                  properties: {
                    firstName: {
                      type: 'string',
                      description: 'User first name',
                      minLength: 3,
                      maxLength: 20,
                      example: 'Alain'
                    },
                    lastName: {
                      type: 'string',
                      description: 'User last name',
                      minLength: 3,
                      maxLength: 20,
                      example: 'Doe'
                    },
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User email address',
                      example: 'alain275@example.com'
                    },
                    password: {
                      type: 'string',
                      format: 'password',
                      description: 'User password (must meet complexity requirements)',
                      example: 'StrongPassword123!'
                    },
                    gender: {
                      type: 'string',
                      enum: ['male', 'female', 'other'],
                      description: 'User gender',
                      example: 'male'
                    },
                    phone: {
                      type: 'string',
                      description: 'User phone number in international format',
                      example: '+1234567890'
                    },
                    role: {
                      type: 'string',
                      enum: ['Admin', 'Member'],
                      description: 'User role (defaults to Member if not specified)',
                      example: 'Member'
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'User successfully created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'User created successfully. Please verify your email.'
                      },
                      data: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Bad request, validation error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            409: {
              description: 'Email already exists',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/login': {
        post: {
          summary: 'Log in a user',
          description: 'Authenticates a user and returns a JWT token',
          tags: ['Authentication'],
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User email address',
                      example: 'alain275@example.com'
                    },
                    password: {
                      type: 'string',
                      format: 'password',
                      description: 'User password',
                      example: 'StrongPassword123!'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'User successfully logged in',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'Logged in successfully'
                      },
                      token: {
                        type: 'string',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                      },
                      data: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            403: {
              description: 'Account is not active',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/logout': {
        post: {
          summary: 'Log out a user',
          description: 'Invalidates the user\'s JWT token',
          tags: ['Authentication'],
          security: [
            {
              bearerAuth: []
            }
          ],
          responses: {
            200: {
              description: 'User successfully logged out',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'Logged out successfully'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized, token is missing or invalid',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/auth/google': {
        get: {
          summary: 'Initiate Google OAuth authentication',
          description: 'Redirects the user to Google\'s authentication page',
          tags: ['Authentication'],
          security: [],
          responses: {
            302: {
              description: 'Redirects to Google login page'
            }
          }
        }
      },
      '/api/users/auth/google/callback': {
        get: {
          summary: 'Google OAuth callback endpoint',
          description: 'Callback URL for Google OAuth authentication',
          tags: ['Authentication'],
          security: [],
          parameters: [
            {
              in: 'query',
              name: 'code',
              schema: {
                type: 'string'
              },
              description: 'Authorization code from Google'
            }
          ],
          responses: {
            302: {
              description: 'Redirects after successful Google authentication'
            }
          }
        }
      },
      '/api/users/auth/google/token': {
        get: {
          summary: 'Get JWT token after Google authentication',
          description: 'Exchanges Google OAuth credentials for a JWT token',
          tags: ['Authentication'],
          security: [],
          responses: {
            200: {
              description: 'Returns JWT token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      token: {
                        type: 'string',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                      },
                      data: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/auth/google/failure': {
        get: {
          summary: 'Handler for Google authentication failure',
          description: 'Endpoint for handling failed Google authentication',
          tags: ['Authentication'],
          security: [],
          responses: {
            401: {
              description: 'Google authentication failed',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/verify-email': {
        get: {
          summary: 'Verify user\'s email address',
          description: 'Verifies the user\'s email using a token sent to their email',
          tags: ['Authentication'],
          security: [],
          parameters: [
            {
              in: 'query',
              name: 'token',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Verification token sent to email'
            }
          ],
          responses: {
            200: {
              description: 'Email successfully verified',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'Email verified successfully'
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Invalid or expired token',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/verify-otp': {
        post: {
          summary: 'Verify OTP code',
          description: 'Verifies a one-time password sent to the user',
          tags: ['Authentication'],
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'otp'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User\'s email address',
                      example: 'alain275@example.com'
                    },
                    otp: {
                      type: 'string',
                      description: 'One-time password received',
                      example: '123456'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'OTP verified successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'OTP verified successfully'
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Invalid or expired OTP',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/profile': {
        get: {
          summary: 'Get current user\'s profile',
          description: 'Retrieves the profile of the currently authenticated user',
          tags: ['Profile'],
          security: [
            {
              bearerAuth: []
            }
          ],
          responses: {
            200: {
              description: 'User profile retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      data: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized, token is missing or invalid',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/me': {
        get: {
          summary: 'Get current user\'s details',
          description: 'Alternative endpoint to retrieve the current user\'s profile',
          tags: ['Profile'],
          security: [
            {
              bearerAuth: []
            }
          ],
          responses: {
            200: {
              description: 'User details retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      data: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized, token is missing or invalid',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/update-profile': {
        patch: {
          summary: 'Update user profile',
          description: 'Updates the profile information of the current user',
          tags: ['Profile'],
          security: [
            {
              bearerAuth: []
            }
          ],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    firstName: {
                      type: 'string',
                      description: 'User\'s first name',
                      example: 'Alain'
                    },
                    lastName: {
                      type: 'string',
                      description: 'User\'s last name',
                      example: 'Updated'
                    },
                    phone: {
                      type: 'string',
                      description: 'User\'s phone number',
                      example: '+1234567890'
                    },
                    gender: {
                      type: 'string',
                      enum: ['male', 'female', 'other'],
                      description: 'User\'s gender',
                      example: 'male'
                    },
                    images: {
                      type: 'string',
                      format: 'binary',
                      description: 'User\'s profile image'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Profile updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'Profile updated successfully'
                      },
                      data: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized, token is missing or invalid',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/{id}/update-password': {
        patch: {
          summary: 'Update user password',
          description: 'Allows a user to update their password',
          tags: ['Profile'],
          security: [
            {
              bearerAuth: []
            }
          ],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'User ID'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['oldPassword', 'newPassword'],
                  properties: {
                    oldPassword: {
                      type: 'string',
                      format: 'password',
                      description: 'Current password',
                      example: 'CurrentPassword123!'
                    },
                    newPassword: {
                      type: 'string',
                      format: 'password',
                      description: 'New password',
                      example: 'NewPassword123!'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Password updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'Password updated successfully'
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Current password is incorrect',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized, token is missing or invalid',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/request-password-reset': {
        post: {
          summary: 'Request password reset',
          description: 'Sends a password reset link to the user\'s email',
          tags: ['Authentication'],
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'Email address for password reset',
                      example: 'alain275@example.com'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Password reset email sent',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'Password reset email sent'
                      }
                    }
                  }
                }
              }
            },
            404: {
              description: 'Email not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/reset-password': {
        post: {
          summary: 'Reset password with token',
          description: 'Resets the user\'s password using a token sent to their email',
          tags: ['Authentication'],
          security: [],
          parameters: [
            {
              in: 'query',
              name: 'token',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Reset token'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['newPassword'],
                  properties: {
                    newPassword: {
                      type: 'string',
                      format: 'password',
                      description: 'New password',
                      example: 'NewPassword123!'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Password reset successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'Password has been reset successfully'
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Invalid or expired token',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/users': {
        get: {
          summary: 'Get all users',
          description: 'Admin only - Retrieves a list of all users',
          tags: ['Admin'],
          security: [
            {
              bearerAuth: []
            }
          ],
          responses: {
            200: {
              description: 'List of all users',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      results: {
                        type: 'number',
                        example: 10
                      },
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/User'
                        }
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            403: {
              description: 'Forbidden, admin access required',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/{id}/role': {
        patch: {
          summary: 'Update user role',
          description: 'Admin only - Updates a user\'s role',
          tags: ['Admin'],
          security: [
            {
              bearerAuth: []
            }
          ],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'User ID'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['role'],
                  properties: {
                    role: {
                      type: 'string',
                      enum: ['Admin', 'Member'],
                      description: 'New user role',
                      example: 'Admin'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Role updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'User role updated successfully'
                      },
                      data: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            403: {
              description: 'Forbidden, admin access required',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            404: {
              description: 'User not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/change-account-status/{id}': {
        patch: {
          summary: 'Change user account status',
          description: 'Admin only - Activates or deactivates a user account',
          tags: ['Admin'],
          security: [
            {
              bearerAuth: []
            }
          ],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'User ID'
            }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    activationReason: {
                      type: 'string',
                      description: 'Reason for account deactivation (required when deactivating)',
                      example: 'User requested account deactivation'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Account status changed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'Account status changed successfully'
                      },
                      data: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            403: {
              description: 'Forbidden, admin access required',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            404: {
              description: 'User not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users/{id}': {
        delete: {
          summary: 'Delete user',
          description: 'Deletes a user account',
          tags: ['Admin'],
          security: [
            {
              bearerAuth: []
            }
          ],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'User ID'
            }
          ],
          responses: {
            200: {
              description: 'User deleted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'success'
                      },
                      message: {
                        type: 'string',
                        example: 'User deleted successfully'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            404: {
              description: 'User not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      // Add these path definitions to your paths object
'/api/blogs': {
  get: {
    summary: 'Get all published blogs',
    description: 'Retrieves a list of all published blog posts',
    tags: ['Blogs'],
    security: [],
    responses: {
      200: {
        description: 'List of published blogs',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'success'
                },
                results: {
                  type: 'number',
                  example: 10
                },
                data: {
                  type: 'object',
                  properties: {
                    blogs: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Blog'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  },
  post: {
    summary: 'Create a new blog post',
    description: 'Admin only - Creates a new blog post',
    tags: ['Blogs'],
    security: [
      {
        bearerAuth: []
      }
    ],
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['title', 'content', 'summary', 'category'],
            properties: {
              title: {
                type: 'string',
                description: 'Blog title',
                example: 'Introduction to Cyber Security'
              },
              content: {
                type: 'string',
                description: 'Blog content (HTML/markdown formatted)',
                example: 'This is a comprehensive guide to cyber security basics...'
              },
              summary: {
                type: 'string',
                description: 'Brief summary of the blog content',
                example: 'Learn the fundamentals of cyber security in this guide.'
              },
              category: {
                type: 'string',
                enum: ['Cyber security', 'Front-end', 'Back-end'],
                description: 'Blog category',
                example: 'Cyber security'
              },
              image: {
                type: 'string',
                format: 'binary',
                description: 'Blog featured image'
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Blog created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'success'
                },
                message: {
                  type: 'string',
                  example: 'Blog created successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    blog: {
                      $ref: '#/components/schemas/Blog'
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized, token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      403: {
        description: 'Forbidden, admin access required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  }
},
'/api/blogs/blog/{id}': {
  get: {
    summary: 'Get blog by ID',
    description: 'Retrieves a specific blog post by its ID',
    tags: ['Blogs'],
    security: [],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        },
        description: 'Blog ID'
      }
    ],
    responses: {
      200: {
        description: 'Blog retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'success'
                },
                data: {
                  type: 'object',
                  properties: {
                    blog: {
                      $ref: '#/components/schemas/Blog'
                    }
                  }
                }
              }
            }
          }
        }
      },
      404: {
        description: 'Blog not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  }
},
'/api/blogs/category/{category}': {
  get: {
    summary: 'Get blogs by category',
    description: 'Retrieves all published blogs in a specific category',
    tags: ['Blogs'],
    security: [],
    parameters: [
      {
        in: 'path',
        name: 'category',
        required: true,
        schema: {
          type: 'string',
          enum: ['Cyber security', 'Front-end', 'Back-end']
        },
        description: 'Blog category'
      }
    ],
    responses: {
      200: {
        description: 'Blogs retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'success'
                },
                results: {
                  type: 'number',
                  example: 5
                },
                data: {
                  type: 'object',
                  properties: {
                    blogs: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Blog'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Invalid category',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  }
},
'/api/blogs/featured': {
  get: {
    summary: 'Get featured blogs',
    description: 'Retrieves most viewed blogs',
    tags: ['Blogs'],
    security: [],
    parameters: [
      {
        in: 'query',
        name: 'limit',
        schema: {
          type: 'integer',
          default: 3
        },
        description: 'Maximum number of blogs to return'
      }
    ],
    responses: {
      200: {
        description: 'Featured blogs retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'success'
                },
                results: {
                  type: 'number',
                  example: 3
                },
                data: {
                  type: 'object',
                  properties: {
                    blogs: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Blog'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
},
'/api/blogs/admin/all': {
  get: {
    summary: 'Get all blogs (including unpublished)',
    description: 'Admin only - Retrieves all blog posts including drafts/unpublished',
    tags: ['Blogs', 'Admin'],
    security: [
      {
        bearerAuth: []
      }
    ],
    responses: {
      200: {
        description: 'All blogs retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'success'
                },
                results: {
                  type: 'number',
                  example: 15
                },
                data: {
                  type: 'object',
                  properties: {
                    blogs: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Blog'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized, token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      403: {
        description: 'Forbidden, admin access required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  }
},
'/api/blogs/{id}': {
  put: {
    summary: 'Update blog',
    description: 'Admin only - Updates an existing blog post',
    tags: ['Blogs', 'Admin'],
    security: [
      {
        bearerAuth: []
      }
    ],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        },
        description: 'Blog ID'
      }
    ],
    requestBody: {
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Blog title'
              },
              content: {
                type: 'string',
                description: 'Blog content (HTML/markdown formatted)'
              },
              summary: {
                type: 'string',
                description: 'Brief summary of the blog content'
              },
              category: {
                type: 'string',
                enum: ['Cyber security', 'Front-end', 'Back-end'],
                description: 'Blog category'
              },
              image: {
                type: 'string',
                format: 'binary',
                description: 'Blog featured image'
              },
              isPublished: {
                type: 'boolean',
                description: 'Publication status of the blog'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Blog updated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'success'
                },
                message: {
                  type: 'string',
                  example: 'Blog updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    blog: {
                      $ref: '#/components/schemas/Blog'
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized, token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      403: {
        description: 'Forbidden, admin access required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      404: {
        description: 'Blog not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  },
  delete: {
    summary: 'Delete blog',
    description: 'Admin only - Deletes a blog post',
    tags: ['Blogs', 'Admin'],
    security: [
      {
        bearerAuth: []
      }
    ],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        },
        description: 'Blog ID'
      }
    ],
    responses: {
      200: {
        description: 'Blog deleted successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'success'
                },
                message: {
                  type: 'string',
                  example: 'Blog deleted successfully'
                }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized, token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      403: {
        description: 'Forbidden, admin access required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      404: {
        description: 'Blog not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  }
},
'/api/blogs/{id}/toggle-publish': {
  patch: {
    summary: 'Toggle blog publication status',
    description: 'Admin only - Toggles the published/unpublished status of a blog',
    tags: ['Blogs', 'Admin'],
    security: [
      {
        bearerAuth: []
      }
    ],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        },
        description: 'Blog ID'
      }
    ],
    responses: {
      200: {
        description: 'Blog publication status toggled successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'success'
                },
                message: {
                  type: 'string',
                  example: 'Blog published successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    blog: {
                      $ref: '#/components/schemas/Blog'
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized, token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      403: {
        description: 'Forbidden, admin access required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      404: {
        description: 'Blog not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  }
}
    }
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
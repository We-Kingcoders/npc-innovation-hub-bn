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
        url: 'https://npc-innovation-hub-bn.onrender.com',
        description: 'Production server (HTTPS)',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints'
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
      },
      // Add this to your existing tags array
      {
        name: 'Members',
        description: 'Member information management endpoints'
      },
      {
        name: 'Projects',
        description: 'Projects information management endpoints'
      },
      {
        name: 'Resources',
        description: 'Resources information management endpoints'
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
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
  patch: {
    summary: 'Partially update blog',
    description: 'Admin only - Partially updates an existing blog post with only the provided fields',
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
},
// Add these path definitions to your paths object
'/api/members': {
  get: {
    summary: 'Get all members',
    description: 'Public endpoint - Retrieves all member information in card format',
    tags: ['Members'],
    security: [],
    parameters: [
      {
        in: 'query',
        name: 'page',
        schema: {
          type: 'integer',
          default: 1
        },
        description: 'Page number'
      },
      {
        in: 'query',
        name: 'limit',
        schema: {
          type: 'integer',
          default: 12
        },
        description: 'Number of members per page'
      }
    ],
    responses: {
      200: {
        description: 'List of member cards',
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
                  example: 12
                },
                totalItems: {
                  type: 'number',
                  example: 50
                },
                totalPages: {
                  type: 'number',
                  example: 5
                },
                currentPage: {
                  type: 'number',
                  example: 1
                },
                data: {
                  type: 'object',
                  properties: {
                    members: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Member unique identifier'
                          },
                          name: {
                            type: 'string',
                            description: 'Member full name'
                          },
                          role: {
                            type: 'string',
                            description: 'Professional role/title'
                          },
                          imageUrl: {
                            type: 'string',
                            format: 'uri',
                            description: 'URL to member profile image'
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
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'error'
                },
                message: {
                  type: 'string',
                  example: 'An error occurred while fetching members'
                }
              }
            }
          }
        }
      }
    }
  },
  post: {
    summary: 'Create member information',
    description: 'Creates basic information for the authenticated member',
    tags: ['Members'],
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
            required: ['name', 'role'],
            properties: {
              name: {
                type: 'string',
                description: 'Full name'
              },
              role: {
                type: 'string',
                description: 'Professional role/title'
              },
              bio: {
                type: 'string',
                description: 'Professional bio'
              },
              image: {
                type: 'string',
                format: 'binary',
                description: 'Profile image file'
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member information created successfully',
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
                  example: 'Member information created successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    member: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                          description: 'Member unique identifier'
                        },
                        userId: {
                          type: 'string',
                          format: 'uuid',
                          description: 'Associated user ID'
                        },
                        name: {
                          type: 'string',
                          description: 'Member full name'
                        },
                        role: {
                          type: 'string',
                          description: 'Professional role/title'
                        },
                        imageUrl: {
                          type: 'string',
                          format: 'uri',
                          description: 'URL to member profile image'
                        },
                        bio: {
                          type: 'string',
                          description: 'Member bio/description'
                        },
                        skills: {
                          type: 'array',
                          items: {
                            type: 'string'
                          },
                          description: 'List of skills'
                        },
                        createdAt: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Record creation timestamp'
                        },
                        updatedAt: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Record last update timestamp'
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
      400: {
        description: 'Bad request - Missing required fields',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'fail'
                },
                message: {
                  type: 'string',
                  example: 'Please provide name and role'
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
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'fail'
                },
                message: {
                  type: 'string',
                  example: 'You are not logged in. Please log in to get access.'
                }
              }
            }
          }
        }
      }
    }
  },
  put: {
    summary: 'Replace member information',
    description: 'Replaces the entire basic information for the authenticated member',
    tags: ['Members'],
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
              name: {
                type: 'string',
                description: 'Full name'
              },
              role: {
                type: 'string',
                description: 'Professional role/title'
              },
              bio: {
                type: 'string',
                description: 'Professional bio'
              },
              image: {
                type: 'string',
                format: 'binary',
                description: 'Profile image file'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Member information updated successfully',
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
                  example: 'Member information updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    member: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                          description: 'Member unique identifier'
                        },
                        userId: {
                          type: 'string',
                          format: 'uuid',
                          description: 'Associated user ID'
                        },
                        name: {
                          type: 'string',
                          description: 'Member full name'
                        },
                        role: {
                          type: 'string',
                          description: 'Professional role/title'
                        },
                        imageUrl: {
                          type: 'string',
                          format: 'uri',
                          description: 'URL to member profile image'
                        },
                        bio: {
                          type: 'string',
                          description: 'Member bio/description'
                        },
                        skills: {
                          type: 'array',
                          items: {
                            type: 'string'
                          },
                          description: 'List of skills'
                        },
                        createdAt: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Record creation timestamp'
                        },
                        updatedAt: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Record last update timestamp'
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
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'fail'
                },
                message: {
                  type: 'string',
                  example: 'You are not logged in. Please log in to get access.'
                }
              }
            }
          }
        }
      },
      404: {
        description: 'Member not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'fail'
                },
                message: {
                  type: 'string',
                  example: 'Member not found'
                }
              }
            }
          }
        }
      }
    }
  },
  patch: {
    summary: 'Update member information',
    description: 'Partially updates basic information for the authenticated member. Only provided fields will be updated.',
    tags: ['Members'],
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
              name: {
                type: 'string',
                description: 'Full name'
              },
              role: {
                type: 'string',
                description: 'Professional role/title'
              },
              bio: {
                type: 'string',
                description: 'Professional bio'
              },
              image: {
                type: 'string',
                format: 'binary',
                description: 'Profile image file'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Member information updated successfully',
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
                  example: 'Member information updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    member: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                          description: 'Member unique identifier'
                        },
                        userId: {
                          type: 'string',
                          format: 'uuid',
                          description: 'Associated user ID'
                        },
                        name: {
                          type: 'string',
                          description: 'Member full name'
                        },
                        role: {
                          type: 'string',
                          description: 'Professional role/title'
                        },
                        imageUrl: {
                          type: 'string',
                          format: 'uri',
                          description: 'URL to member profile image'
                        },
                        bio: {
                          type: 'string',
                          description: 'Member bio/description'
                        },
                        skills: {
                          type: 'array',
                          items: {
                            type: 'string'
                          },
                          description: 'List of skills'
                        },
                        createdAt: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Record creation timestamp'
                        },
                        updatedAt: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Record last update timestamp'
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
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'fail'
                },
                message: {
                  type: 'string',
                  example: 'You are not logged in. Please log in to get access.'
                }
              }
            }
          }
        }
      },
      404: {
        description: 'Member not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'fail'
                },
                message: {
                  type: 'string',
                  example: 'Member not found'
                }
              }
            }
          }
        }
      }
    }
  },
  delete: {
    summary: 'Delete member information',
    description: 'Deletes the authenticated member\'s information',
    tags: ['Members'],
    security: [
      {
        bearerAuth: []
      }
    ],
    responses: {
      200: {
        description: 'Member information deleted successfully',
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
                  example: 'Member information deleted successfully'
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
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'fail'
                },
                message: {
                  type: 'string',
                  example: 'You are not logged in. Please log in to get access.'
                }
              }
            }
          }
        }
      },
      404: {
        description: 'Member not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'fail'
                },
                message: {
                  type: 'string',
                  example: 'Member not found'
                }
              }
            }
          }
        }
      }
    }
  }
},

'/api/members/member/{id}': {
  get: {
    summary: 'Get member by ID',
    description: 'Public endpoint - Retrieves member information by ID',
    tags: ['Members'],
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
        description: 'Member ID'
      }
    ],
    responses: {
      200: {
        description: 'Member information retrieved successfully',
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
                    member: {
                      $ref: '#/components/schemas/Member'
                    }
                  }
                }
              }
            }
          }
        }
      },
      404: {
        description: 'Member not found',
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

'/api/members/me': {
  get: {
    summary: 'Get own member information',
    description: 'Retrieves the authenticated member\'s information',
    tags: ['Members'],
    security: [
      {
        bearerAuth: []
      }
    ],
    responses: {
      200: {
        description: 'Member information retrieved successfully',
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
                    member: {
                      $ref: '#/components/schemas/Member'
                    }
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
      404: {
        description: 'Member information not found',
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

'/api/members/contacts': {
  post: {
    summary: 'Create contact information',
    description: 'Creates contact information for a new member profile',
    tags: ['Members'],
    security: [
      {
        bearerAuth: []
      }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              linkedin: {
                type: 'string',
                format: 'uri',
                description: 'LinkedIn profile URL'
              },
              github: {
                type: 'string',
                format: 'uri',
                description: 'GitHub profile URL'
              },
              twitter: {
                type: 'string',
                format: 'uri',
                description: 'Twitter profile URL'
              },
              telegram: {
                type: 'string',
                format: 'uri',
                description: 'Telegram contact URL'
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member profile with contacts created',
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
                  example: 'Member profile with contacts created'
                },
                data: {
                  type: 'object',
                  properties: {
                    contacts: {
                      type: 'object',
                      properties: {
                        linkedin: { type: 'string' },
                        github: { type: 'string' },
                        twitter: { type: 'string' },
                        telegram: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      200: {
        description: 'Contact information updated successfully',
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
                  example: 'Contact information updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    contacts: {
                      type: 'object',
                      properties: {
                        linkedin: { type: 'string' },
                        github: { type: 'string' },
                        twitter: { type: 'string' },
                        telegram: { type: 'string' }
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
        description: 'Unauthorized',
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
  put: {
    summary: 'Replace contact information',
    description: 'Replaces all contact information for the authenticated member',
    tags: ['Members'],
    security: [
      {
        bearerAuth: []
      }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              linkedin: {
                type: 'string',
                format: 'uri',
                description: 'LinkedIn profile URL'
              },
              github: {
                type: 'string',
                format: 'uri',
                description: 'GitHub profile URL'
              },
              twitter: {
                type: 'string',
                format: 'uri',
                description: 'Twitter profile URL'
              },
              telegram: {
                type: 'string',
                format: 'uri',
                description: 'Telegram contact URL'
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member profile with contacts created',
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
                  example: 'Member profile with contacts created'
                },
                data: {
                  type: 'object',
                  properties: {
                    contacts: {
                      type: 'object',
                      properties: {
                        linkedin: { type: 'string' },
                        github: { type: 'string' },
                        twitter: { type: 'string' },
                        telegram: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      200: {
        description: 'Contact information updated successfully',
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
                  example: 'Contact information updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    contacts: {
                      type: 'object',
                      properties: {
                        linkedin: { type: 'string' },
                        github: { type: 'string' },
                        twitter: { type: 'string' },
                        telegram: { type: 'string' }
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
        description: 'Unauthorized',
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
  patch: {
    summary: 'Update contact information',
    description: 'Partially updates contact information. Only provided fields will be updated.',
    tags: ['Members'],
    security: [
      {
        bearerAuth: []
      }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              linkedin: {
                type: 'string',
                format: 'uri',
                description: 'LinkedIn profile URL'
              },
              github: {
                type: 'string',
                format: 'uri',
                description: 'GitHub profile URL'
              },
              twitter: {
                type: 'string',
                format: 'uri',
                description: 'Twitter profile URL'
              },
              telegram: {
                type: 'string',
                format: 'uri',
                description: 'Telegram contact URL'
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member profile with contacts created',
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
                  example: 'Member profile with contacts created'
                },
                data: {
                  type: 'object',
                  properties: {
                    contacts: {
                      type: 'object',
                      properties: {
                        linkedin: { type: 'string' },
                        github: { type: 'string' },
                        twitter: { type: 'string' },
                        telegram: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      200: {
        description: 'Contact information updated successfully',
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
                  example: 'Contact information updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    contacts: {
                      type: 'object',
                      properties: {
                        linkedin: { type: 'string' },
                        github: { type: 'string' },
                        twitter: { type: 'string' },
                        telegram: { type: 'string' }
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
        description: 'Unauthorized',
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

'/api/members/education': {
  post: {
    summary: 'Create education information',
    description: 'Creates education details for a new member profile',
    tags: ['Members'],
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
              degree: {
                type: 'string',
                description: 'Educational degree'
              },
              institution: {
                type: 'string',
                description: 'Educational institution'
              },
              description: {
                type: 'string',
                description: 'Description of education'
              },
              educationImage: {
                type: 'string',
                format: 'binary',
                description: 'Institution image file'
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member profile with education created',
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
                  example: 'Member profile with education created'
                },
                data: {
                  type: 'object',
                  properties: {
                    education: {
                      type: 'object',
                      properties: {
                        degree: { type: 'string' },
                        institution: { type: 'string' },
                        description: { type: 'string' },
                        imageUrl: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      200: {
        description: 'Education details updated successfully',
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
                  example: 'Education information updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    education: {
                      type: 'object',
                      properties: {
                        degree: { type: 'string' },
                        institution: { type: 'string' },
                        description: { type: 'string' },
                        imageUrl: { type: 'string' }
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
        description: 'Unauthorized',
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
  put: {
    summary: 'Replace education information',
    description: 'Replaces all education details for the authenticated member',
    tags: ['Members'],
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
              degree: {
                type: 'string',
                description: 'Educational degree'
              },
              institution: {
                type: 'string',
                description: 'Educational institution'
              },
              description: {
                type: 'string',
                description: 'Description of education'
              },
              educationImage: {
                type: 'string',
                format: 'binary',
                description: 'Institution image file'
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member profile with education created',
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
                  example: 'Member profile with education created'
                },
                data: {
                  type: 'object',
                  properties: {
                    education: {
                      type: 'object',
                      properties: {
                        degree: { type: 'string' },
                        institution: { type: 'string' },
                        description: { type: 'string' },
                        imageUrl: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      200: {
        description: 'Education details updated successfully',
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
                  example: 'Education information updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    education: {
                      type: 'object',
                      properties: {
                        degree: { type: 'string' },
                        institution: { type: 'string' },
                        description: { type: 'string' },
                        imageUrl: { type: 'string' }
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
        description: 'Unauthorized',
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
  patch: {
    summary: 'Update education information',
    description: 'Partially updates education details. Only provided fields will be updated.',
    tags: ['Members'],
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
              degree: {
                type: 'string',
                description: 'Educational degree'
              },
              institution: {
                type: 'string',
                description: 'Educational institution'
              },
              description: {
                type: 'string',
                description: 'Description of education'
              },
              educationImage: {
                type: 'string',
                format: 'binary',
                description: 'Institution image file'
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member profile with education created',
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
                  example: 'Member profile with education created'
                },
                data: {
                  type: 'object',
                  properties: {
                    education: {
                      type: 'object',
                      properties: {
                        degree: { type: 'string' },
                        institution: { type: 'string' },
                        description: { type: 'string' },
                        imageUrl: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      200: {
        description: 'Education details updated successfully',
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
                  example: 'Education information updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    education: {
                      type: 'object',
                      properties: {
                        degree: { type: 'string' },
                        institution: { type: 'string' },
                        description: { type: 'string' },
                        imageUrl: { type: 'string' }
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
        description: 'Unauthorized',
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

'/api/members/skills': {
  post: {
    summary: 'Create skills information',
    description: 'Creates detailed skills and proficiency information for a new member profile',
    tags: ['Members'],
    security: [
      {
        bearerAuth: []
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['skillDetails'],
            properties: {
              skillDetails: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['name', 'technologies', 'percent'],
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Skill category name'
                    },
                    technologies: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'List of specific technologies'
                    },
                    percent: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 100,
                      description: 'Proficiency percentage'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member profile with skills created',
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
                  example: 'Member profile with skills created'
                },
                data: {
                  type: 'object',
                  properties: {
                    skillDetails: {
                      type: 'array',
                      items: {
                        type: 'object'
                      }
                    },
                    skills: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      200: {
        description: 'Skills updated successfully',
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
                  example: 'Skills updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    skillDetails: {
                      type: 'array',
                      items: {
                        type: 'object'
                      }
                    },
                    skills: {
                      type: 'array',
                      items: {
                        type: 'string'
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
        description: 'Invalid skills data format',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
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
      }
    }
  },
  put: {
    summary: 'Replace skills information',
    description: 'Replaces all skills and proficiency information for the authenticated member',
    tags: ['Members'],
    security: [
      {
        bearerAuth: []
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['skillDetails'],
            properties: {
              skillDetails: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['name', 'technologies', 'percent'],
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Skill category name'
                    },
                    technologies: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'List of specific technologies'
                    },
                    percent: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 100,
                      description: 'Proficiency percentage'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member profile with skills created',
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
                  example: 'Member profile with skills created'
                },
                data: {
                  type: 'object',
                  properties: {
                    skillDetails: {
                      type: 'array',
                      items: {
                        type: 'object'
                      }
                    },
                    skills: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      200: {
        description: 'Skills updated successfully',
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
                  example: 'Skills updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    skillDetails: {
                      type: 'array',
                      items: {
                        type: 'object'
                      }
                    },
                    skills: {
                      type: 'array',
                      items: {
                        type: 'string'
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
        description: 'Invalid skills data format',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
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
      }
    }
  },
  patch: {
    summary: 'Update skills information',
    description: 'For skills, patch replaces the entire skills array like PUT, since skills are treated as a collection',
    tags: ['Members'],
    security: [
      {
        bearerAuth: []
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['skillDetails'],
            properties: {
              skillDetails: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['name', 'technologies', 'percent'],
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Skill category name'
                    },
                    technologies: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'List of specific technologies'
                    },
                    percent: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 100,
                      description: 'Proficiency percentage'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member profile with skills created',
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
                  example: 'Member profile with skills created'
                },
                data: {
                  type: 'object',
                  properties: {
                    skillDetails: {
                      type: 'array',
                      items: {
                        type: 'object'
                      }
                    },
                    skills: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      200: {
        description: 'Skills updated successfully',
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
                  example: 'Skills updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    skillDetails: {
                      type: 'array',
                      items: {
                        type: 'object'
                      }
                    },
                    skills: {
                      type: 'array',
                      items: {
                        type: 'string'
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
        description: 'Invalid skills data format',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
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
      }
    }
  }
},

'/api/members/import': {
  post: {
    summary: 'Import members from mock data',
    description: 'Admin only - Imports member information from mock data',
    tags: ['Members', 'Admin'],
    security: [
      {
        bearerAuth: []
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['members'],
            properties: {
              members: {
                type: 'array',
                items: {
                  type: 'object'
                },
                description: 'Array of member data objects'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Members imported successfully',
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
                  example: 'Imported 5 members successfully with 0 failures'
                },
                data: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'integer'
                    },
                    failed: {
                      type: 'integer'
                    },
                    errors: {
                      type: 'array',
                      items: {
                        type: 'string'
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
        description: 'Forbidden - Admin only',
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

'/api/projects': {
    get: {
      summary: 'Get all projects',
      description: 'Public endpoint - Retrieves all projects with pagination',
      tags: ['Projects'],
      security: [],
      parameters: [
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 12
          },
          description: 'Number of projects per page'
        }
      ],
      responses: {
        200: {
          description: 'List of projects',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ProjectsListResponse'
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
      summary: 'Create a new project',
      description: 'Creates a new project for the authenticated user',
      tags: ['Projects'],
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
              required: ['title', 'description'],
              properties: {
                title: {
                  type: 'string',
                  description: 'Project title'
                },
                description: {
                  type: 'string',
                  description: 'Project description'
                },
                link: {
                  type: 'string',
                  description: 'Project link'
                },
                demo: {
                  type: 'string',
                  description: 'Project demo link'
                },
                image: {
                  type: 'string',
                  format: 'binary',
                  description: 'Project image file'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Project created successfully',
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
                    example: 'Project created successfully'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      project: {
                        $ref: '#/components/schemas/Project'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Missing required fields',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
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
        }
      }
    }
  },

  '/api/projects/project/{id}': {
    get: {
      summary: 'Get project by ID',
      description: 'Public endpoint - Retrieves project information by ID',
      tags: ['Projects'],
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
          description: 'Project ID'
        }
      ],
      responses: {
        200: {
          description: 'Project information retrieved successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ProjectResponse'
              }
            }
          }
        },
        404: {
          description: 'Project not found',
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

  '/api/projects/{id}': {
    patch: {
      summary: 'Update a project',
      description: 'Partially updates a project. Only provided fields will be updated. Any authenticated user can update any project.',
      tags: ['Projects'],
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
          description: 'Project ID'
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
                  description: 'Project title'
                },
                description: {
                  type: 'string',
                  description: 'Project description'
                },
                link: {
                  type: 'string',
                  description: 'Project link'
                },
                demo: {
                  type: 'string',
                  description: 'Project demo link'
                },
                image: {
                  type: 'string',
                  format: 'binary',
                  description: 'Project image file'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Project updated successfully',
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
                    example: 'Project updated successfully'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      project: {
                        $ref: '#/components/schemas/Project'
                      }
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
        404: {
          description: 'Project not found',
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
      summary: 'Delete a project',
      description: 'Deletes a project. Any authenticated user can delete any project.',
      tags: ['Projects'],
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
          description: 'Project ID'
        }
      ],
      responses: {
        200: {
          description: 'Project deleted successfully',
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
                    example: 'Project deleted successfully'
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
          description: 'Project not found',
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

  '/api/projects/me': {
    get: {
      summary: 'Get my projects',
      description: 'Retrieves all projects created by the authenticated user',
      tags: ['Projects'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 12
          },
          description: 'Number of projects per page'
        }
      ],
      responses: {
        200: {
          description: 'List of user\'s projects',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ProjectsListResponse'
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
        }
      }
    }
  },
  
  '/api/projects/search': {
    get: {
      summary: 'Search projects',
      description: 'Public endpoint - Search projects by title, description or owner name',
      tags: ['Projects'],
      security: [],
      parameters: [
        {
          in: 'query',
          name: 'q',
          required: true,
          schema: {
            type: 'string'
          },
          description: 'Search term'
        },
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 12
          },
          description: 'Number of projects per page'
        }
      ],
      responses: {
        200: {
          description: 'Search results',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ProjectsListResponse'
              }
            }
          }
        },
        400: {
          description: 'Bad request - Missing search term',
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
 '/api/resources': {
    get: {
      summary: 'Get all resources',
      description: 'Retrieves all resources with pagination and filtering. Requires authentication.',
      tags: ['Resources'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 12
          },
          description: 'Number of resources per page'
        },
        {
          in: 'query',
          name: 'category',
          schema: {
            type: 'string',
            enum: ['Backend', 'Frontend', 'Cybersecurity']
          },
          description: 'Filter by category'
        },
        {
          in: 'query',
          name: 'type',
          schema: {
            type: 'string',
            enum: ['Video', 'Documentation', 'Book', 'Other']
          },
          description: 'Filter by resource type'
        },
        {
          in: 'query',
          name: 'difficulty',
          schema: {
            type: 'string',
            enum: ['Beginner', 'Intermediate', 'Advanced']
          },
          description: 'Filter by difficulty level'
        }
      ],
      responses: {
        200: {
          description: 'List of resources',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ResourcesListResponse'
              }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        500: {
          description: 'Server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    },
    post: {
      summary: 'Create a new resource (Admin only)',
      description: 'Creates a new resource. Requires admin role. Supports video uploads.',
      tags: ['Resources', 'Admin'],
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
              required: ['title', 'description', 'category', 'type', 'author'],
              properties: {
                title: {
                  type: 'string',
                  description: 'Resource title'
                },
                description: {
                  type: 'string',
                  description: 'Resource description'
                },
                category: {
                  type: 'string',
                  enum: ['Backend', 'Frontend', 'Cybersecurity'],
                  description: 'Resource category'
                },
                type: {
                  type: 'string',
                  enum: ['Video', 'Documentation', 'Book', 'Other'],
                  description: 'Resource type'
                },
                difficulty: {
                  type: 'string',
                  enum: ['Beginner', 'Intermediate', 'Advanced'],
                  description: 'Resource difficulty level'
                },
                url: {
                  type: 'string',
                  description: 'URL to external resource (if not uploading a video)'
                },
                author: {
                  type: 'string',
                  description: 'Resource author'
                },
                isPaid: {
                  type: 'boolean',
                  description: 'Whether the resource is paid'
                },
                price: {
                  type: 'number',
                  description: 'Resource price (if paid)'
                },
                purchaseDate: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Date when the resource was purchased'
                },
                platform: {
                  type: 'string',
                  description: 'Platform where the resource was purchased'
                },
                duration: {
                  type: 'integer',
                  description: 'Duration in seconds for videos, estimated reading time for other resources'
                },
                tags: {
                  type: 'string',
                  description: 'Comma-separated resource tags'
                },
                image: {
                  type: 'string',
                  format: 'binary',
                  description: 'Resource image file'
                },
                video: {
                  type: 'string',
                  format: 'binary',
                  description: 'Video file (if uploading a video)'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Resource created successfully',
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
                    example: 'Resource created successfully'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      resource: {
                        $ref: '#/components/schemas/Resource'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Missing required fields',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Admin only',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },

  '/api/resources/resource/{id}': {
    get: {
      summary: 'Get resource by ID',
      description: 'Retrieves resource information by ID. Requires authentication.',
      tags: ['Resources'],
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
          description: 'Resource ID'
        }
      ],
      responses: {
        200: {
          description: 'Resource information retrieved successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ResourceResponse'
              }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },

  '/api/resources/{id}': {
    put: {
      summary: 'Fully update a resource (Admin only)',
      description: 'Completely updates a resource with all fields. Requires admin role.',
      tags: ['Resources', 'Admin'],
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
          description: 'Resource ID'
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
                  description: 'Resource title'
                },
                description: {
                  type: 'string',
                  description: 'Resource description'
                },
                category: {
                  type: 'string',
                  enum: ['Backend', 'Frontend', 'Cybersecurity'],
                  description: 'Resource category'
                },
                type: {
                  type: 'string',
                  enum: ['Video', 'Documentation', 'Book', 'Other'],
                  description: 'Resource type'
                },
                difficulty: {
                  type: 'string',
                  enum: ['Beginner', 'Intermediate', 'Advanced'],
                  description: 'Resource difficulty level'
                },
                url: {
                  type: 'string',
                  description: 'URL to external resource (if not uploading a video)'
                },
                author: {
                  type: 'string',
                  description: 'Resource author'
                },
                isPaid: {
                  type: 'boolean',
                  description: 'Whether the resource is paid'
                },
                price: {
                  type: 'number',
                  description: 'Resource price (if paid)'
                },
                purchaseDate: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Date when the resource was purchased'
                },
                platform: {
                  type: 'string',
                  description: 'Platform where the resource was purchased'
                },
                tags: {
                  type: 'string',
                  description: 'Comma-separated resource tags'
                },
                isFeatured: {
                  type: 'boolean',
                  description: 'Whether the resource is featured'
                },
                duration: {
                  type: 'integer',
                  description: 'Duration in seconds for videos, estimated reading time for other resources'
                },
                image: {
                  type: 'string',
                  format: 'binary',
                  description: 'Resource image file'
                },
                video: {
                  type: 'string',
                  format: 'binary',
                  description: 'Video file (if uploading a video)'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Resource updated successfully',
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
                    example: 'Resource updated successfully'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      resource: {
                        $ref: '#/components/schemas/Resource'
                      }
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
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Admin only',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    },
    patch: {
      summary: 'Partially update a resource (Admin only)',
      description: 'Updates specific fields of a resource. Requires admin role. Only updates the fields that are provided.',
      tags: ['Resources', 'Admin'],
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
          description: 'Resource ID'
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
                  description: 'Resource title'
                },
                description: {
                  type: 'string',
                  description: 'Resource description'
                },
                category: {
                  type: 'string',
                  enum: ['Backend', 'Frontend', 'Cybersecurity'],
                  description: 'Resource category'
                },
                type: {
                  type: 'string',
                  enum: ['Video', 'Documentation', 'Book', 'Other'],
                  description: 'Resource type'
                },
                difficulty: {
                  type: 'string',
                  enum: ['Beginner', 'Intermediate', 'Advanced'],
                  description: 'Resource difficulty level'
                },
                url: {
                  type: 'string',
                  description: 'URL to external resource (if not uploading a video)'
                },
                author: {
                  type: 'string',
                  description: 'Resource author'
                },
                isPaid: {
                  type: 'boolean',
                  description: 'Whether the resource is paid'
                },
                price: {
                  type: 'number',
                  description: 'Resource price (if paid)'
                },
                purchaseDate: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Date when the resource was purchased'
                },
                platform: {
                  type: 'string',
                  description: 'Platform where the resource was purchased'
                },
                tags: {
                  type: 'string',
                  description: 'Comma-separated resource tags'
                },
                isFeatured: {
                  type: 'boolean',
                  description: 'Whether the resource is featured'
                },
                duration: {
                  type: 'integer',
                  description: 'Duration in seconds for videos, estimated reading time for other resources'
                },
                image: {
                  type: 'string',
                  format: 'binary',
                  description: 'Resource image file'
                },
                video: {
                  type: 'string',
                  format: 'binary',
                  description: 'Video file (if uploading a video)'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Resource partially updated successfully',
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
                    example: 'Resource updated successfully'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      resource: {
                        $ref: '#/components/schemas/Resource'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - No fields to update provided',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'fail'
                  },
                  message: {
                    type: 'string',
                    example: 'No fields to update were provided'
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
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Admin only',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    },
    delete: {
      summary: 'Delete a resource (Admin only)',
      description: 'Deletes a resource. Requires admin role.',
      tags: ['Resources', 'Admin'],
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
          description: 'Resource ID'
        }
      ],
      responses: {
        200: {
          description: 'Resource deleted successfully',
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
                    example: 'Resource deleted successfully'
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
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Admin only',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },

  '/api/resources/featured': {
    get: {
      summary: 'Get featured resources',
      description: 'Retrieves featured resources. Requires authentication.',
      tags: ['Resources'],
      security: [
        {
          bearerAuth: []
        }
      ],
      responses: {
        200: {
          description: 'List of featured resources',
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
                    example: 6
                  },
                  data: {
                    type: 'object',
                    properties: {
                      resources: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Resource'
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
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },

  '/api/resources/saved': {
    get: {
      summary: 'Get user\'s saved resources',
      description: 'Retrieves resources saved by the authenticated user.',
      tags: ['Resources'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 12
          },
          description: 'Number of resources per page'
        }
      ],
      responses: {
        200: {
          description: 'List of saved resources',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ResourcesListResponse'
              }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },

  '/api/resources/search': {
    get: {
      summary: 'Search resources',
      description: 'Search resources by title, description, author or tags. Requires authentication.',
      tags: ['Resources'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'query',
          name: 'q',
          required: true,
          schema: {
            type: 'string'
          },
          description: 'Search term or keyword'
        },
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number for pagination'
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 12
          },
          description: 'Number of resources per page'
        },
        {
          in: 'query',
          name: 'category',
          schema: {
            type: 'string',
            enum: ['Backend', 'Frontend', 'Cybersecurity']
          },
          description: 'Filter search results by category'
        },
        {
          in: 'query',
          name: 'type',
          schema: {
            type: 'string',
            enum: ['Video', 'Documentation', 'Book', 'Other']
          },
          description: 'Filter search results by resource type'
        },
        {
          in: 'query',
          name: 'difficulty',
          schema: {
            type: 'string',
            enum: ['Beginner', 'Intermediate', 'Advanced']
          },
          description: 'Filter search results by difficulty level'
        },
        {
          in: 'query',
          name: 'isPaid',
          schema: {
            type: 'boolean'
          },
          description: 'Filter by whether resources are paid or free'
        },
        {
          in: 'query',
          name: 'sort',
          schema: {
            type: 'string',
            enum: ['recent', 'popular', 'title']
          },
          description: 'Sort search results by: recent (default), popular (most upvotes), or title (alphabetical)'
        }
      ],
      responses: {
        200: {
          description: 'Search results',
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
                    description: 'Number of results in current page',
                    example: 12
                  },
                  totalItems: {
                    type: 'number',
                    description: 'Total number of matching resources',
                    example: 42
                  },
                  totalPages: {
                    type: 'number',
                    description: 'Total number of pages',
                    example: 4
                  },
                  currentPage: {
                    type: 'number',
                    description: 'Current page number',
                    example: 1
                  },
                  data: {
                    type: 'object',
                    properties: {
                      resources: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Resource'
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
          description: 'Bad request - Missing search term',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'fail'
                  },
                  message: {
                    type: 'string',
                    example: 'Please provide a search term'
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized - User not logged in',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },

  '/api/resources/category/{category}': {
    get: {
      summary: 'Get resources by category',
      description: 'Retrieves resources filtered by category. Requires authentication.',
      tags: ['Resources'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'path',
          name: 'category',
          required: true,
          schema: {
            type: 'string',
            enum: ['Backend', 'Frontend', 'Cybersecurity']
          },
          description: 'Resource category'
        },
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 12
          },
          description: 'Number of resources per page'
        }
      ],
      responses: {
        200: {
          description: 'List of resources in the category',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ResourcesListResponse'
              }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },

  '/api/resources/type/{type}': {
    get: {
      summary: 'Get resources by type',
      description: 'Retrieves resources filtered by type. Requires authentication.',
      tags: ['Resources'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'path',
          name: 'type',
          required: true,
          schema: {
            type: 'string',
            enum: ['Video', 'Documentation', 'Book', 'Other']
          },
          description: 'Resource type'
        },
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 12
          },
          description: 'Number of resources per page'
        }
      ],
      responses: {
        200: {
          description: 'List of resources of the specified type',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ResourcesListResponse'
              }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },

  '/api/resources/videos': {
    get: {
      summary: 'Get video resources',
      description: 'Retrieves all video resources. Requires authentication.',
      tags: ['Resources'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 12
          },
          description: 'Number of resources per page'
        }
      ],
      responses: {
        200: {
          description: 'List of video resources',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ResourcesListResponse'
              }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },

  '/api/resources/resource/{id}/upvote': {
    post: {
      summary: 'Upvote a resource',
      description: 'Upvotes a resource or removes an existing upvote. Requires authentication.',
      tags: ['Resources'],
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
          description: 'Resource ID'
        }
      ],
      responses: {
        200: {
          description: 'Resource upvoted or upvote removed successfully',
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
                    example: 'Resource upvoted successfully'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      hasUpvoted: {
                        type: 'boolean'
                      },
                      upvotes: {
                        type: 'integer'
                      }
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
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },

  '/api/resources/resource/{id}/save': {
    post: {
      summary: 'Save a resource',
      description: 'Saves a resource to user\'s collection or removes it. Requires authentication.',
      tags: ['Resources'],
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
          description: 'Resource ID'
        }
      ],
      responses: {
        200: {
          description: 'Resource saved or removed from saved successfully',
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
                    example: 'Resource saved successfully'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      hasSaved: {
                        type: 'boolean'
                      }
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
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
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
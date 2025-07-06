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
  },
'/api/events': {
  get: {
    summary: 'Get all events',
    description: 'Public endpoint - Retrieves all events with pagination and filtering options',
    tags: ['Events'],
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
          default: 10
        },
        description: 'Number of events per page'
      },
      {
        in: 'query',
        name: 'filter',
        schema: {
          type: 'string',
          enum: ['all', 'upcoming', 'past'],
          default: 'all'
        },
        description: 'Filter events by time'
      },
      {
        in: 'query',
        name: 'sortBy',
        schema: {
          type: 'string',
          enum: ['startTime', 'title', 'createdAt'],
          default: 'startTime'
        },
        description: 'Field to sort by'
      },
      {
        in: 'query',
        name: 'sortOrder',
        schema: {
          type: 'string',
          enum: ['ASC', 'DESC'],
          default: 'ASC'
        },
        description: 'Sort order'
      }
    ],
    responses: {
      200: {
        description: 'List of events',
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
                totalItems: {
                  type: 'number',
                  example: 45
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
                    events: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Event'
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
    summary: 'Create a new event',
    description: 'Admin only - Creates a new event',
    tags: ['Events', 'Admin'],
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
            required: ['title', 'location', 'startTime', 'endTime', 'description'],
            properties: {
              title: {
                type: 'string',
                description: 'Event title'
              },
              location: {
                type: 'string',
                description: 'Event location'
              },
              startTime: {
                type: 'string',
                format: 'date-time',
                description: 'Event start time'
              },
              endTime: {
                type: 'string',
                format: 'date-time',
                description: 'Event end time'
              },
              description: {
                type: 'string',
                description: 'Event description'
              },
              image: {
                type: 'string',
                format: 'binary',
                description: 'Event image'
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Event created successfully',
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
                  example: 'Event created successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    event: {
                      $ref: '#/components/schemas/Event'
                    }
                  }
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request - Missing required fields or invalid data',
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
'/api/events/{id}': {
  get: {
    summary: 'Get event by ID',
    description: 'Public endpoint - Retrieves a specific event by ID',
    tags: ['Events'],
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
        description: 'Event ID'
      }
    ],
    responses: {
      200: {
        description: 'Event details',
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
                    event: {
                      $ref: '#/components/schemas/Event'
                    }
                  }
                }
              }
            }
          }
        }
      },
      404: {
        description: 'Event not found',
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
    summary: 'Update event',
    description: 'Admin only - Updates an existing event. Only provided fields will be updated.',
    tags: ['Events', 'Admin'],
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
        description: 'Event ID'
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
                description: 'Event title'
              },
              location: {
                type: 'string',
                description: 'Event location'
              },
              startTime: {
                type: 'string',
                format: 'date-time',
                description: 'Event start time'
              },
              endTime: {
                type: 'string',
                format: 'date-time',
                description: 'Event end time'
              },
              description: {
                type: 'string',
                description: 'Event description'
              },
              image: {
                type: 'string',
                format: 'binary',
                description: 'Event image'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Event updated successfully',
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
                  example: 'Event updated successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    event: {
                      $ref: '#/components/schemas/Event'
                    }
                  }
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request - Invalid data',
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
      },
      404: {
        description: 'Event not found',
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
    summary: 'Delete event',
    description: 'Admin only - Deletes an event and its associated data',
    tags: ['Events', 'Admin'],
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
        description: 'Event ID'
      }
    ],
    responses: {
      200: {
        description: 'Event deleted successfully',
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
                  example: 'Event deleted successfully'
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
      },
      404: {
        description: 'Event not found',
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
'/api/events/{id}/attendees': {
  get: {
    summary: 'Get event attendees',
    description: 'Admin only - Retrieves a list of users who have RSVPed to or attended an event',
    tags: ['Events', 'Admin'],
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
        description: 'Event ID'
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
          default: 10
        },
        description: 'Number of attendees per page'
      },
      {
        in: 'query',
        name: 'status',
        schema: {
          type: 'string',
          enum: ['going', 'attended', 'cancelled']
        },
        description: 'Filter by attendance status'
      }
    ],
    responses: {
      200: {
        description: 'List of attendees',
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
                totalItems: {
                  type: 'number',
                  example: 25
                },
                totalPages: {
                  type: 'number',
                  example: 3
                },
                currentPage: {
                  type: 'number',
                  example: 1
                },
                data: {
                  type: 'object',
                  properties: {
                    attendances: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/AttendanceWithUser'
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
      },
      404: {
        description: 'Event not found',
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
'/api/events/{eventId}/rsvp': {
  post: {
    summary: 'RSVP to an event',
    description: 'Allows a user to RSVP to attend an upcoming event',
    tags: ['Events'],
    security: [
      {
        bearerAuth: []
      }
    ],
    parameters: [
      {
        in: 'path',
        name: 'eventId',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        },
        description: 'Event ID'
      }
    ],
    responses: {
      201: {
        description: 'RSVP successful',
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
                  example: 'RSVP successful'
                },
                data: {
                  type: 'object',
                  properties: {
                    attendance: {
                      $ref: '#/components/schemas/Attendance'
                    }
                  }
                }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request - Already RSVPed or past event',
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
      },
      404: {
        description: 'Event not found',
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
'/api/events/{eventId}/cancel-rsvp': {
  patch: {
    summary: 'Cancel RSVP',
    description: 'Allows a user to cancel their RSVP to an event',
    tags: ['Events'],
    security: [
      {
        bearerAuth: []
      }
    ],
    parameters: [
      {
        in: 'path',
        name: 'eventId',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        },
        description: 'Event ID'
      }
    ],
    responses: {
      200: {
        description: 'RSVP cancelled successfully',
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
                  example: 'RSVP cancelled successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    attendance: {
                      $ref: '#/components/schemas/Attendance'
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
        description: 'Event not found or no RSVP found',
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
'/api/events/{eventId}/rsvp-status': {
  get: {
    summary: 'Check RSVP status',
    description: 'Checks if the current user has RSVPed to an event',
    tags: ['Events'],
    security: [
      {
        bearerAuth: []
      }
    ],
    parameters: [
      {
        in: 'path',
        name: 'eventId',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        },
        description: 'Event ID'
      }
    ],
    responses: {
      200: {
        description: 'RSVP status retrieved',
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
                    isRsvped: {
                      type: 'boolean',
                      example: true
                    },
                    status: {
                      type: 'string',
                      enum: ['going', 'attended', 'cancelled', null],
                      example: 'going'
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
        description: 'Event not found',
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
'/api/events/{eventId}/mark-attendance/{userId}': {
  post: {
    summary: 'Mark attendance',
    description: 'Admin only - Marks a user as having attended an event',
    tags: ['Events', 'Admin'],
    security: [
      {
        bearerAuth: []
      }
    ],
    parameters: [
      {
        in: 'path',
        name: 'eventId',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        },
        description: 'Event ID'
      },
      {
        in: 'path',
        name: 'userId',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        },
        description: 'User ID'
      }
    ],
    responses: {
      200: {
        description: 'Attendance marked successfully',
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
                  example: 'Attendance marked successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    attendance: {
                      $ref: '#/components/schemas/Attendance'
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
      },
      404: {
        description: 'Event or user not found',
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
'/api/events/my-events': {
  get: {
    summary: 'Get my events',
    description: 'Retrieves events that the current user has RSVPed to or attended',
    tags: ['Events'],
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
          default: 10
        },
        description: 'Number of events per page'
      },
      {
        in: 'query',
        name: 'status',
        schema: {
          type: 'string',
          enum: ['going', 'attended', 'cancelled']
        },
        description: 'Filter by attendance status'
      },
      {
        in: 'query',
        name: 'filter',
        schema: {
          type: 'string',
          enum: ['all', 'upcoming', 'past'],
          default: 'all'
        },
        description: 'Filter events by time'
      }
    ],
    responses: {
      200: {
        description: 'List of user\'s events',
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
                totalItems: {
                  type: 'number',
                  example: 20
                },
                totalPages: {
                  type: 'number',
                  example: 2
                },
                currentPage: {
                  type: 'number',
                  example: 1
                },
                data: {
                  type: 'object',
                  properties: {
                    attendances: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/AttendanceWithEvent'
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
 '/api/chat': {
    get: {
      summary: 'Get recent conversations',
      description: 'Retrieves all recent conversations for the authenticated user',
      tags: ['Chat'],
      security: [
        {
          bearerAuth: []
        }
      ],
      responses: {
        200: {
          description: 'List of recent conversations',
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
                      conversations: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            userId: {
                              type: 'string',
                              format: 'uuid'
                            },
                            firstName: {
                              type: 'string'
                            },
                            lastName: {
                              type: 'string'
                            },
                            image: {
                              type: 'string'
                            },
                            role: {
                              type: 'string'
                            },
                            lastMessage: {
                              type: 'object',
                              properties: {
                                id: {
                                  type: 'string',
                                  format: 'uuid'
                                },
                                content: {
                                  type: 'string'
                                },
                                createdAt: {
                                  type: 'string',
                                  format: 'date-time'
                                }
                              }
                            },
                            unreadCount: {
                              type: 'integer'
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
    }
  },
  
  '/api/chat/{userId}': {
    get: {
      summary: 'Get direct messages with a user',
      description: 'Retrieves direct messages between the authenticated user and another user',
      tags: ['Chat'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'path',
          name: 'userId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID of the user to get messages with'
        },
        {
          in: 'query',
          name: 'page',
          required: false,
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number for pagination'
        },
        {
          in: 'query',
          name: 'limit',
          required: false,
          schema: {
            type: 'integer',
            default: 50
          },
          description: 'Number of messages per page'
        }
      ],
      responses: {
        200: {
          description: 'List of direct messages',
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
                      messages: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/DirectMessage'
                        }
                      },
                      otherUser: {
                        $ref: '#/components/schemas/UserBasic'
                      },
                      total: {
                        type: 'integer'
                      },
                      currentPage: {
                        type: 'integer'
                      },
                      totalPages: {
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
          description: 'User not found',
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
      summary: 'Send a direct message',
      description: 'Sends a direct message to another user',
      tags: ['Chat'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'path',
          name: 'userId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID of the user to send message to'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['content'],
              properties: {
                content: {
                  type: 'string',
                  description: 'Content of the message'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Message sent successfully',
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
                      message: {
                        $ref: '#/components/schemas/DirectMessage'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - empty content',
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
        404: {
          description: 'Receiver not found',
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
    }
  },
  
  '/api/chat/{userId}/{messageId}': {
    patch: {
      summary: 'Edit a direct message',
      description: 'Partially updates the content of an existing direct message. User must be the sender of the message.',
      tags: ['Chat'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'path',
          name: 'userId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID of the user in conversation'
        },
        {
          in: 'path',
          name: 'messageId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID of the message to edit'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['content'],
              properties: {
                content: {
                  type: 'string',
                  description: 'New content of the message'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Message updated successfully',
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
                      message: {
                        $ref: '#/components/schemas/DirectMessage'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - empty content',
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
          description: 'Forbidden - no permission to edit this message',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Message not found',
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
    
    delete: {
      summary: 'Delete a direct message',
      description: 'Deletes an existing direct message. User must be the sender of the message.',
      tags: ['Chat'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'path',
          name: 'userId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID of the user in conversation'
        },
        {
          in: 'path',
          name: 'messageId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'ID of the message to delete'
        }
      ],
      responses: {
        200: {
          description: 'Message deleted successfully',
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
                    example: 'Message deleted successfully'
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
          description: 'Forbidden - no permission to delete this message',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Message not found',
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
    }
  },
'/api/hub/messages': {
    get: {
      summary: 'Get hub messages',
      description: 'Retrieves messages from the community hub chat room',
      tags: ['Hub'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'query',
          name: 'page',
          required: false,
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number for pagination'
        },
        {
          in: 'query',
          name: 'limit',
          required: false,
          schema: {
            type: 'integer',
            default: 50
          },
          description: 'Number of messages per page'
        }
      ],
      responses: {
        200: {
          description: 'List of hub messages',
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
                      messages: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/HubMessage'
                        }
                      },
                      total: {
                        type: 'integer'
                      },
                      currentPage: {
                        type: 'integer'
                      },
                      totalPages: {
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
      summary: 'Send a hub message',
      description: 'Sends a message to the community hub chat room',
      tags: ['Hub'],
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
              required: ['content'],
              properties: {
                content: {
                  type: 'string',
                  description: 'Content of the message'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Message sent successfully',
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
                      message: {
                        $ref: '#/components/schemas/HubMessage'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - empty content',
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
    }
  },
  
  '/api/hub/messages/{id}': {
    patch: {
      summary: 'Edit a hub message',
      description: 'Partially updates the content of an existing hub message. User must be the sender of the message or an admin.',
      tags: ['Hub'],
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
          description: 'ID of the message to edit'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['content'],
              properties: {
                content: {
                  type: 'string',
                  description: 'New content of the message'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Message updated successfully',
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
                      message: {
                        $ref: '#/components/schemas/HubMessage'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - empty content',
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
          description: 'Forbidden - no permission to edit this message',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Message not found',
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
    
    delete: {
      summary: 'Delete a hub message',
      description: 'Deletes an existing hub message. User must be the sender of the message or an admin.',
      tags: ['Hub'],
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
          description: 'ID of the message to delete'
        }
      ],
      responses: {
        200: {
          description: 'Message deleted successfully',
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
                    example: 'Message deleted successfully'
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
          description: 'Forbidden - no permission to delete this message',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Message not found',
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
    }
  },

  '/api/notifications': {
    get: {
      summary: 'Get user notifications',
      description: 'Retrieves all notifications for the authenticated user with pagination',
      tags: ['Notifications'],
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          in: 'query',
          name: 'page',
          required: false,
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number for pagination'
        },
        {
          in: 'query',
          name: 'limit',
          required: false,
          schema: {
            type: 'integer',
            default: 10
          },
          description: 'Number of notifications per page'
        },
        {
          in: 'query',
          name: 'read',
          required: false,
          schema: {
            type: 'boolean'
          },
          description: 'Filter by read status (true/false)'
        }
      ],
      responses: {
        200: {
          description: 'List of notifications',
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
                      notifications: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Notification'
                        }
                      },
                      total: {
                        type: 'integer'
                      },
                      currentPage: {
                        type: 'integer'
                      },
                      totalPages: {
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
    }
  },
  
  '/api/notifications/unread-count': {
    get: {
      summary: 'Get unread notification count',
      description: 'Retrieves the count of unread notifications for the authenticated user',
      tags: ['Notifications'],
      security: [
        {
          bearerAuth: []
        }
      ],
      responses: {
        200: {
          description: 'Unread notification count',
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
                      count: {
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
    }
  },
  
  '/api/notifications/{id}/mark-read': {
    patch: {
      summary: 'Mark notification as read',
      description: 'Marks a specific notification as read',
      tags: ['Notifications'],
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
          description: 'ID of the notification to mark as read'
        }
      ],
      responses: {
        200: {
          description: 'Notification marked as read',
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
                      notification: {
                        $ref: '#/components/schemas/Notification'
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
          description: 'Forbidden - not the recipient of this notification',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Notification not found',
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
    }
  },
  
  '/api/notifications/mark-all-read': {
    patch: {
      summary: 'Mark all notifications as read',
      description: 'Marks all notifications for the authenticated user as read',
      tags: ['Notifications'],
      security: [
        {
          bearerAuth: []
        }
      ],
      responses: {
        200: {
          description: 'All notifications marked as read',
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
                    example: 'All notifications marked as read'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      count: {
                        type: 'integer',
                        description: 'Number of notifications marked as read'
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
    }
  },
  
  '/api/notifications/{id}': {
    delete: {
      summary: 'Delete a notification',
      description: 'Deletes a specific notification for the authenticated user',
      tags: ['Notifications'],
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
          description: 'ID of the notification to delete'
        }
      ],
      responses: {
        200: {
          description: 'Notification deleted successfully',
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
                    example: 'Notification deleted successfully'
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
          description: 'Forbidden - not the recipient of this notification',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Notification not found',
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
    }
  },



 '/api/hire-us': {
    post: {
      summary: 'Submit a hire inquiry',
      description: 'Submit a new inquiry for hiring or collaboration services',
      tags: ['Hire Inquiries'],
      security: [], // Empty array indicates no authentication required
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'first_name', 'last_name', 'company_name', 'job_title', 'country', 'message', 'consent'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Client email address',
                  example: 'john.doe@example.com'
                },
                first_name: {
                  type: 'string',
                  description: 'Client first name',
                  minLength: 2,
                  maxLength: 50,
                  example: 'John'
                },
                last_name: {
                  type: 'string',
                  description: 'Client last name',
                  minLength: 2,
                  maxLength: 50,
                  example: 'Doe'
                },
                company_name: {
                  type: 'string',
                  description: 'Client company name',
                  minLength: 2,
                  maxLength: 100,
                  example: 'Acme Corporation'
                },
                job_title: {
                  type: 'string',
                  description: 'Client job title',
                  minLength: 2,
                  maxLength: 100,
                  example: 'Chief Technology Officer'
                },
                country: {
                  type: 'string',
                  description: 'Client country',
                  minLength: 2,
                  maxLength: 100,
                  example: 'Rwanda'
                },
                message: {
                  type: 'string',
                  description: 'Inquiry message content',
                  minLength: 10,
                  maxLength: 2000,
                  example: 'We are looking for a technology partner to help us develop our new platform. Our project involves building a mobile application with backend services.'
                },
                consent: {
                  type: 'boolean',
                  description: 'Client consent to process data and send communications',
                  example: true
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Inquiry successfully submitted',
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
                    example: 'Your inquiry has been submitted successfully. We will contact you soon.'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      inquiry: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000'
                          },
                          email: {
                            type: 'string',
                            format: 'email',
                            example: 'john.doe@example.com'
                          },
                          name: {
                            type: 'string',
                            example: 'John Doe'
                          },
                          created_at: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-07-06T09:51:07Z'
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
          description: 'Bad request - validation error',
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
                    example: 'Please provide all required fields'
                  }
                }
              }
            }
          }
        },
        500: {
          description: 'Internal server error',
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
                    example: 'Failed to submit your inquiry. Please try again later.'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/admin/hire-inquiries': {
    get: {
      summary: 'Get all hire inquiries',
      description: 'Retrieves a list of all hire inquiries for admin review',
      tags: ['Admin', 'Hire Inquiries'],
      security: [
        {
          bearerAuth: []
        }
      ],
      responses: {
        200: {
          description: 'List of hire inquiries retrieved successfully',
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
                      $ref: '#/components/schemas/HireInquiry'
                    }
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized - Missing or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Not an admin user',
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
    }
  },
  '/api/admin/hire-inquiries/{id}': {
    get: {
      summary: 'Get a specific hire inquiry',
      description: 'Retrieves details of a specific hire inquiry by ID',
      tags: ['Admin', 'Hire Inquiries'],
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
          description: 'ID of the hire inquiry to retrieve'
        }
      ],
      responses: {
        200: {
          description: 'Hire inquiry retrieved successfully',
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
                    $ref: '#/components/schemas/HireInquiry'
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized - Missing or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Not an admin user',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Hire inquiry not found',
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
    put: {
      summary: 'Update a hire inquiry',
      description: 'Updates the status or details of a specific hire inquiry',
      tags: ['Admin', 'Hire Inquiries'],
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
          description: 'ID of the hire inquiry to update'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'reviewed', 'completed', 'rejected'],
                  description: 'Current status of the inquiry'
                },
                notes: {
                  type: 'string',
                  description: 'Admin notes about the inquiry'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Hire inquiry updated successfully',
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
                    $ref: '#/components/schemas/HireInquiry'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid input data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        401: {
          description: 'Unauthorized - Missing or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Not an admin user',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Hire inquiry not found',
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
    delete: {
      summary: 'Delete a hire inquiry',
      description: 'Permanently removes a hire inquiry from the system',
      tags: ['Admin', 'Hire Inquiries'],
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
          description: 'ID of the hire inquiry to delete'
        }
      ],
      responses: {
        200: {
          description: 'Hire inquiry deleted successfully',
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
                    example: 'Hire inquiry deleted successfully'
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized - Missing or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        403: {
          description: 'Forbidden - Not an admin user',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        404: {
          description: 'Hire inquiry not found',
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
    }
  },
'/api/admin/hire-inquiries/{id}/reply': {
  post: {
    summary: 'Reply to a hire inquiry',
    description: 'Sends an email reply to the user who submitted the hire inquiry',
    tags: ['Admin', 'Hire Inquiries'],
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
        description: 'ID of the hire inquiry to reply to'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['subject', 'message'],
            properties: {
              subject: {
                type: 'string',
                description: 'Subject line for the email reply',
                example: 'Response to your NPC Innovation Hub inquiry'
              },
              message: {
                type: 'string',
                description: 'Reply message content to send to the inquiry submitter',
                example: 'Thank you for your interest in our services. We would like to discuss your project in more detail.'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Reply sent successfully',
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
                  example: 'Reply sent successfully'
                },
                data: {
                  type: 'object',
                  properties: {
                    inquiry: {
                      $ref: '#/components/schemas/HireInquiry'
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
                  example: 'Please provide subject and message'
                }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized - Missing or invalid token',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      403: {
        description: 'Forbidden - Not an admin user',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      404: {
        description: 'Hire inquiry not found',
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
                  example: 'Inquiry not found'
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
                  example: 'Failed to send email. Please try again later.'
                }
              }
            }
          }
        }
      }
    }
  }
},

    

    }
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
import swaggerJSDoc from 'swagger-jsdoc';
// import config from './config/app.config';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Express TypeScript API',
    version: '1.0.0',
    description: 'API documentation',
  },
  servers: [
    {
      url: 'http://localhost:5000/api-docs', // Use config.app.port if needed
      description: 'Development server',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [], // No API routes yet
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
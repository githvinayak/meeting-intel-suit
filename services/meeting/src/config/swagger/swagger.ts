import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Meeting Service API',
      version: '1.0.0',
      description: 'AI-powered meeting transcription and intelligence platform - Meeting Service',
      contact: {
        name: 'API Support',
        email: 'support@meetingintel.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Development server'
      },
      {
        url: 'http://localhost:3000',
        description: 'API Gateway (Production)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from Auth Service'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Meetings',
        description: 'Meeting management endpoints'
      },
      {
        name: 'Health',
        description: 'Service health check'
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/index.ts'] // Path to route files with Swagger comments
};

export const swaggerSpec = swaggerJsdoc(options);
import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { ApiResponse } from '@meeting-intelligence/shared-types';
import { connectDatabase } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import { initializeRedis } from './config/redis';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger/swagger';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
console.log('logging the port from env ', process.env.PORT);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
initializeRedis();
connectDatabase();

app.set('trust proxy', true);

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Auth service is healthy',
    data: {
      service: 'auth',
      timestamp: new Date().toISOString(),
    },
  };
  res.json(response);
});

// Swagger documentation
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Auth Service API Docs',
  })
);

// Swagger JSON endpoint
app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
// Auth routes
app.use('/api/v1/auth', authRoutes);

// Error handler MUST be last
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🔐 Auth service running on port ${PORT}`);
});

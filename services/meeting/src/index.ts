import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ApiResponse } from '@meeting-intelligence/shared-types';
import meetingRoutes from './routes/meetingRoutes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger/swagger';
import { connectDatabase } from './config/db';
import dotenv from 'dotenv';

dotenv.config();
const app: Application = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDatabase();
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

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Meeting service is healthy',
    data: {
      service: 'meeting',
      timestamp: new Date().toISOString(),
    },
  };
  res.json(response);
});

app.use('/api/v1/meeting', meetingRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`📅 Meeting service running on port ${PORT}`);
});

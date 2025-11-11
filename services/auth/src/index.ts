import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { ApiResponse } from '@meeting-intelligence/shared-types';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

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

// Start server
app.listen(PORT, () => {
  console.log(`🔐 Auth service running on port ${PORT}`);
});

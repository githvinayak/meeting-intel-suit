import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ApiResponse } from '@meeting-intelligence/shared-types';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Realtime service is healthy',
    data: {
      service: 'realtime',
      timestamp: new Date().toISOString(),
    },
  };
  res.json(response);
});

// Start server
app.listen(PORT, () => {
  console.log(`⚡ Realtime service running on port ${PORT}`);
});

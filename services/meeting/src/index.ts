import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ApiResponse } from '@meeting-intelligence/shared-types';
import meetingRoutes from './routes/meetingRoutes';
import uploadRoutes from './routes/uploadRoutes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger/swagger';
import { connectDatabase } from './config/db';
import { config } from './config/config';
import { WorkerManager } from './worker/WorkerManager';

const app: Application = express();
const PORT = config.server.port || 3002;
console.log(' meeting service port:', PORT);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDatabase();
WorkerManager.startAll();
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
app.use('/api/v1/meeting', uploadRoutes);

console.log('✅ Configuration loaded successfully');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Server Configuration:');
console.log(`   Port: ${config.server.port}`);
console.log(`   Environment: ${config.server.nodeEnv}`);
console.log(`   Service: ${config.server.serviceName}`);
console.log('');
console.log('💾 Database:');
console.log(`   MongoDB: ${config.database.uri.includes('mongodb') ? '✓ Connected' : '✗ Invalid'}`);
console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
console.log('');
console.log('🤖 OpenAI Configuration:');
console.log(`   API Key: ${config.openai.apiKey ? '✓ Present' : '✗ Missing'}`);
console.log(`   Model: ${config.openai.model}`);
console.log(`   Mode: ${config.openai.useMock ? '🎭 MOCK (Free)' : '🤖 REAL (Paid)'}`);
console.log('');
console.log('🎵 Audio Limits:');
console.log(`   Max Size: ${config.audio.maxSizeMB}MB`);
console.log(`   Max Duration: ${config.audio.maxDuration}s`);
console.log('');
console.log('⚡ Rate Limits:');
console.log(`   Concurrent: ${config.limits.maxConcurrent}`);
console.log(`   Per Day: ${config.limits.maxPerDay}`);
console.log(`   Cost Warning: $${config.limits.warnThreshold}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Start server
app.listen(PORT, () => {
  console.log(`📅 Meeting service running on port ${PORT}`);
});

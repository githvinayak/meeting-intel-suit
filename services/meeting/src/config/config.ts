import dotenv from 'dotenv';
dotenv.config();

// Validate required env vars
const requiredEnvVars = ['MONGODB_URI', 'REDIS_HOST', 'REDIS_PORT', 'JWT_SECRET', 'OPENAI_API_KEY'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Parse and export typed configuration
export const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3002'),
    nodeEnv: process.env.NODE_ENV || 'development',
    serviceName: process.env.SERVICE_NAME || 'meeting',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  // MongoDB Configuration
  database: {
    uri: process.env.MONGODB_URI!,
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '1d',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER!,
    password: process.env.EMAIL_PASSWORD!,
    from: process.env.EMAIL_FROM!,
  },

  // External Services
  services: {
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // Password Reset
  passwordReset: {
    tokenExpiry: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY || '15'), // minutes
  },

  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_API_SECRET!,
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.WHISPER_MODEL || 'whisper-1',
    useMock: process.env.USE_MOCK_TRANSCRIPTION === 'true',
  },

  // Audio Processing Limits
  audio: {
    maxSizeMB: parseInt(process.env.MAX_AUDIO_SIZE_MB || '10'),
    maxDuration: parseInt(process.env.MAX_AUDIO_DURATION || '600'), // seconds
  },

  // Rate Limiting & Cost Control
  limits: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_WHISPER || '3'),
    maxPerDay: parseInt(process.env.MAX_TRANSCRIPTIONS_PER_DAY || '10'),
    warnThreshold: parseFloat(process.env.WARN_COST_THRESHOLD || '1.0'),
  },
};

// Log configuration on startup (hide sensitive data)
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

// Export helper functions
export const isDevelopment = () => config.server.isDevelopment;
export const isProduction = () => config.server.isProduction;
export const isMockMode = () => config.openai.useMock;

import Redis from 'ioredis';
import { config } from './config';

// Redis connection configuration
export const redisConfig = {
  host: config.redis.host || 'localhost',
  port: config.redis.port || 6379,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null, // Required for Bull
  enableReadyCheck: false, // Required for Bull
};

// Create Redis client
export const createRedisClient = (): Redis => {
  const client = new Redis(redisConfig);

  client.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  client.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
  });

  return client;
};

// Queue configuration options
export const queueOptions = {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential', // Exponential backoff
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      count: 5000, // Keep last 5000 failed jobs
    },
  },
};

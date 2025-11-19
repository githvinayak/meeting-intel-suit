import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Build Redis URL with authentication
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Create connection URL
const redisUrl = REDIS_PASSWORD
  ? `redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`
  : `redis://${REDIS_HOST}:${REDIS_PORT}`;

logger.info(
  `Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT} (password: ${REDIS_PASSWORD ? 'yes' : 'no'})`
);

// Create Redis client with URL (this is the most reliable way)
const redis = new Redis(redisUrl, {
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
   maxRetriesPerRequest: 3,
  enableOfflineQueue: true,  // ADD THIS LINE - queues commands until connected
  lazyConnect: false,         // ADD THIS LINE - connect immediately
  showFriendlyErrorStack: true,
});

// Connection event handlers
redis.on('connect', () => {
  logger.info('✓ Redis client connected');
});

redis.on('ready', () => {
  logger.info('✓ Redis client ready and authenticated');
});

redis.on('error', (err) => {
  logger.error('✗ Redis error:', err.message);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  logger.info(`Redis reconnecting in ${delay}ms...`);
});

export default redis;

export const initializeRedis = async (): Promise<void> => {
  try {
    // Explicitly connect
    await redis.connect();

    // Test with PING
    const pingResult = await redis.ping();

    if (pingResult === 'PONG') {
      logger.info('✓ Redis initialized and authenticated successfully');

      // Test SET/GET
      await redis.set('test:connection', 'ok', 'EX', 10);
      const testValue = await redis.get('test:connection');
      logger.info(`✓ Redis test write/read: ${testValue}`);
    }
  } catch (error: any) {
    logger.error('✗ Redis initialization failed:', error.message);
    logger.error('Service will continue without Redis. Token storage will be affected.');
  }
};

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis';

// Rate limiter for login attempts
export const loginLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: async (...args: readonly string[]): Promise<any> => {
      return redis.call(args[0], ...args.slice(1));
    },
    prefix: 'rl:login:',
  }),
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // 5 requests per minute
  message: {
    error: 'Too many login attempts, please try again after a minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  // Remove custom keyGenerator - use default which handles IPv6 properly
  handler: (req, res) => {
    console.log('🚫 RATE LIMIT TRIGGERED for IP:', req.ip);
    res.status(429).json({
      error: 'Too many login attempts, please try again after a minute',
    });
  },
});

// Rate limiter for registration
export const registerLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: async (...args: readonly string[]): Promise<any> => {
      return redis.call(args[0], ...args.slice(1));
    },
    prefix: 'rl:register:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // 10 requests per hour
  message: {
    error: 'Too many registration attempts, please try again after an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator - use default which handles IPv6 properly
});
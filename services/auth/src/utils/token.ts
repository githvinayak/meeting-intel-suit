import redis from '../config/redis';
import { logger } from './logger';
import { getRefreshTokenExpiry } from './jwt';
import { randomUUID } from 'crypto';

/**
 * Store refresh token in Redis with TTL
 * Key format: refresh_token:{userId}:{tokenId}
 */
export const generateTokenId = (): string => {
  return randomUUID();
};

export const storeRefreshToken = async (
  userId: string,
  token: string,
  tokenId: string
): Promise<void> => {
  try {
    const key = `refresh_token:${userId}:${tokenId}`;
    const expiry = getRefreshTokenExpiry(); // In seconds

    await redis.setex(key, expiry, token);
    logger.info(`Refresh token stored for user ${userId}`);
  } catch (error) {
    logger.error('Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
};

/**
 * Get refresh token from Redis
 */
export const getRefreshToken = async (
  userId: string,
  tokenId: string
): Promise<string | null> => {
  try {
    const key = `refresh_token:${userId}:${tokenId}`;
    const token = await redis.get(key);
    return token;
  } catch (error) {
    logger.error('Error retrieving refresh token:', error);
    throw new Error('Failed to retrieve refresh token');
  }
};

/**
 * Delete specific refresh token (logout from one device)
 */
export const deleteRefreshToken = async (
  userId: string,
  tokenId: string
): Promise<void> => {
  try {
    const key = `refresh_token:${userId}:${tokenId}`;
    await redis.del(key);
    logger.info(`Refresh token deleted for user ${userId}`);
  } catch (error) {
    logger.error('Error deleting refresh token:', error);
    throw new Error('Failed to delete refresh token');
  }
};

/**
 * Delete all refresh tokens for a user (logout from all devices)
 */
export const deleteAllUserTokens = async (userId: string): Promise<void> => {
  try {
    const pattern = `refresh_token:${userId}:*`;
    
    // Get all keys matching pattern
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`All tokens deleted for user ${userId} (${keys.length} tokens)`);
    }
  } catch (error) {
    logger.error('Error deleting all user tokens:', error);
    throw new Error('Failed to delete user tokens');
  }
};

/**
 * Check if refresh token exists
 */
export const refreshTokenExists = async (
  userId: string,
  tokenId: string
): Promise<boolean> => {
  try {
    const key = `refresh_token:${userId}:${tokenId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('Error checking token existence:', error);
    return false;
  }
};
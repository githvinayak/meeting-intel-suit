import jwt, { Secret, SignOptions, JwtPayload } from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET: Secret = (process.env.JWT_SECRET || 'fallback-secret').trim();

// Extract the type jsonwebtoken expects for expiresIn
type ExpiresIn = SignOptions['expiresIn'];

const ACCESS_TOKEN_EXPIRY: ExpiresIn =
  (process.env.JWT_ACCESS_EXPIRY?.trim() as ExpiresIn) || '15m';

const REFRESH_TOKEN_EXPIRY: ExpiresIn =
  (process.env.JWT_REFRESH_EXPIRY?.trim() as ExpiresIn) || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role?: string;
  tokenId?: string;
}

export interface DecodedToken extends JwtPayload {
  userId: string;
  email: string;
  name: string;
  role?: string;
  tokenId?: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  try {
    const tokenPayload: Record<string, any> = {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
    };

    // Only include role if present
    if (payload.role) {
      tokenPayload.role = payload.role;
    }

    return jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'meeting-intel-auth',
    });
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Token generation failed');
  }
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  try {
    const tokenPayload: Record<string, any> = {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
    };

    // Include role if present
    if (payload.role) {
      tokenPayload.role = payload.role;
    }

    // CRITICAL: Include tokenId for refresh tokens
    if (payload.tokenId) {
      tokenPayload.tokenId = payload.tokenId;
    }

    return jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'meeting-intel-auth',
    });
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Token generation failed');
  }
};

export const verifyToken = (token: string): DecodedToken => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'meeting-intel-auth',
    });

    if (typeof decoded === 'string') {
      throw new Error('Invalid token format');
    }

    return decoded as DecodedToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    logger.error('Token verification error:', error);
    throw new Error('Token verification failed');
  }
};

export const getRefreshTokenExpiry = (): number => {
  const clean = String(REFRESH_TOKEN_EXPIRY).trim();

  const match = clean.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60;

  const [value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case 's':
      return num;
    case 'm':
      return num * 60;
    case 'h':
      return num * 60 * 60;
    case 'd':
      return num * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60;
  }
};

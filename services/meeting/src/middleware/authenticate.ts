import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

// Extend Express Request to include user data
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided. Authorization header must be: Bearer <token>',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const authServiceUrl = process.env.AUTH_SERVICE_URL;

    // ADD THIS DEBUG LOGGING
    console.log('🔍 Auth Service URL:', authServiceUrl);
    console.log('🔍 Calling:', `${authServiceUrl}/api/auth/verify`);

    if (!authServiceUrl) {
      throw new Error('AUTH_SERVICE_URL not configured');
    }

    // Call Auth Service to verify token
    const response = await axios.get(`${authServiceUrl}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000, // ADD TIMEOUT
    });

    console.log('✅ Auth Service response:', response.data); // ADD THIS

    if (response.data.success && response.data.data.user) {
      req.user = {
        userId: response.data.data.user.id,
        email: response.data.data.user.email,
        name: response.data.data.user.name,
      };

      next();
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
      return;
    }
  } catch (error) {
    // ADD DETAILED ERROR LOGGING
    console.error('❌ Authentication error:', error);

    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
      });

      if (error.response?.status === 401) {
        res.status(401).json({
          success: false,
          message: 'Token expired or invalid',
        });
        return;
      }

      if (error.code === 'ECONNREFUSED') {
        console.error('❌ Auth Service is not running on', process.env.AUTH_SERVICE_URL);
        res.status(503).json({
          success: false,
          message: 'Authentication service unavailable',
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

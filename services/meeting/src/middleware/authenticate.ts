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
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided. Authorization header must be: Bearer <token>'
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token by calling Auth Service
    const authServiceUrl = process.env.AUTH_SERVICE_URL;

    if (!authServiceUrl) {
      throw new Error('AUTH_SERVICE_URL not configured');
    }

    // Call Auth Service to verify token
    const response = await axios.get(`${authServiceUrl}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // If verification successful, attach user data to request
    if (response.data.success && response.data.data.user) {
      req.user = {
        userId: response.data.data.user.id,
        email: response.data.data.user.email,
        name: response.data.data.user.name
      };

      next(); // Proceed to next middleware/controller
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

  } catch (error) {
    // Handle different error scenarios
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        res.status(401).json({
          success: false,
          message: 'Token expired or invalid'
        });
        return;
      }

      if (error.code === 'ECONNREFUSED') {
        console.error('❌ Auth Service is not running');
        res.status(503).json({
          success: false,
          message: 'Authentication service unavailable'
        });
        return;
      }
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};
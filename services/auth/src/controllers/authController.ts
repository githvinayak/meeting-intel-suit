import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { registerSchema } from '../validators/authValidators';

const authService = new AuthService();

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Validate input with Zod
    const validationResult = registerSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    // 2. Call service to register user
    const user = await authService.registerUser(validationResult.data);

    // 3. Send success response
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
      },
    });
  } catch (error: any) {
    // 4. Handle errors
    if (error.statusCode === 409) {
      res.status(409).json({
        success: false,
        message: error.message,
      });
      return;
    }

    // Pass unexpected errors to error handler middleware
    next(error);
  }
};
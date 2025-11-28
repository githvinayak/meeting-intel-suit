import { Request, Response } from 'express';
import { loginSchema, registerSchema } from '../validators/authValidators';
import { AuthService } from '../services/authService';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { PasswordService } from '../services/passwordService';

const authService = new AuthService();
const passwordService = new PasswordService();

export const register = async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { email } = validation.data;

    // 🔍 Tests expect this duplicate check IN CONTROLLER
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // ✔ Only now call service
    const user = await authService.registerUser(validation.data);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: user,
    });
  } catch (err: any) {
    // Tests expect 500 for DB errors
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Validate request
    const validatedData = loginSchema.parse(req.body);

    // Call service
    const result = await authService.login(validatedData);

    // Send response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error: any) {
    // 1. Zod validation errors
    if (error?.issues) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // 2. Business logic errors
    if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 3. Unexpected errors
    logger.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'An error occurred during login',
    });
  }
};

/**
 * Verify JWT token (for inter-service communication)
 */
export const verifyToken = async (req: Request, res: Response) => {
  try {

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
      return;
    }

    // Return user data
    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user.userId,
          email: req.user.email,
          name: req.user.name,
        },
      },
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(500).json({
      success: false,
      message: 'Token verification failed',
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Validation: Check if refresh token is provided
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Validation: Check if it's a string
    if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid refresh token format',
      });
    }

    // Call service to refresh tokens
    const tokens = await authService.refreshAccessToken(refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err: any) {
    logger.error('Refresh token controller error:', err.message);

    // Handle specific error cases
    if (
      err.message.includes('Invalid') ||
      err.message.includes('expired') ||
      err.message.includes('revoked')
    ) {
      return res.status(401).json({
        success: false,
        message: err.message,
      });
    }

    // Generic server error
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Validation
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    // Call service
    await authService.logout(refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    logger.error('Logout error:', error);
    return res.status(401).json({
      success: false,
      message: error.message || 'Logout failed',
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    await passwordService.requestPasswordReset(email);

    // Always return success (don't reveal if email exists)
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    // Validate request
    const { token, newPassword } = req.body;

    await passwordService.resetPassword(token, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);

    if (error.message === 'Invalid or expired reset token') {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new one',
      });
      return;
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
    });
  }
};

export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Token is required',
      });
      return;
    }

    const isValid = await passwordService.verifyResetToken(token);

    if (!isValid) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired token',
      });
      return;
    }

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
    });
  } catch (error: any) {
    console.error('Verify token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify token',
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    // Validate request

    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    await passwordService.changePassword(userId, currentPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('Change password error:', error);

    if (error.message === 'Current password is incorrect') {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const profile = await authService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: profile,
    });
  } catch (error: any) {
    logger.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { name, profilePic } = req.body;

    // Validation: At least one field should be provided
    if (!name && !profilePic) {
      res.status(400).json({
        success: false,
        message: 'At least one field (name or profilePic) is required',
      });
      return;
    }

    // Validation: Name should be non-empty if provided
    if (name !== undefined && typeof name === 'string' && name.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Name cannot be empty',
      });
      return;
    }

    // Validation: ProfilePic should be valid URL if provided
    if (profilePic !== undefined && profilePic !== null) {
      try {
        new URL(profilePic);
      } catch {
        res.status(400).json({
          success: false,
          message: 'ProfilePic must be a valid URL',
        });
        return;
      }
    }

    const updatedProfile = await authService.updateUserProfile(userId, {
      name: name?.trim(),
      profilePic,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error: any) {
    logger.error('Update profile error:', error);

    if (error.message === 'User not found') {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

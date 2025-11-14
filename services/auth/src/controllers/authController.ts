import { Request, Response } from 'express';
import { registerSchema } from '../validators/authValidators';
import { AuthService } from '../services/authService';
import { User } from '../models/User';

const authService = new AuthService();

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

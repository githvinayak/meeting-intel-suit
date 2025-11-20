import express, { Router } from 'express';
import { login, logout, refreshToken, register } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';

const router: Router = express.Router();

// POST /api/v1/auth/register
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User retrieved successfully',
    data: {
      user: req.user,
    },
  });
});

export default router;

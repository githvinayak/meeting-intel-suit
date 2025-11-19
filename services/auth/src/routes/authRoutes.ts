import express, { Router } from 'express';
import { login, register } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';

const router: Router = express.Router();

// Add logging middleware
router.use((req, _res, next) => {
  console.log(`📍 Auth Route Hit: ${req.method} ${req.path}`);
  next();
});

// POST /api/v1/auth/register
router.post('/register', register);
router.post('/login', login);
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

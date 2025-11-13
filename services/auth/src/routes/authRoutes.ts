import express, { Router } from 'express';
import { register } from '../controllers/authController';

const router: Router = express.Router();

// Add logging middleware
router.use((req, _res, next) => {
  console.log(`📍 Auth Route Hit: ${req.method} ${req.path}`);
  next();
});

// POST /api/v1/auth/register
router.post('/register', register);

export default router;
import { Router, type Router as RouterType } from 'express';
import { register } from '../controllers/authController';

const router: RouterType = Router();

// POST /api/auth/register
router.post('/register', register);

export default router;

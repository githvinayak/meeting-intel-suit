import express, { Router } from 'express';
import { getQueueStats } from '../controllers/jobController';

const router: Router = express.Router();

/**
 * @swagger
 * /api/queue/stats:
 *   get:
 *     summary: Get queue statistics
 *     description: Returns overall queue health and job statistics for monitoring
 *     tags:
 *       - Queue
 *     responses:
 *       200:
 *         description: Queue statistics retrieved successfully
 */
router.get('/stats', getQueueStats);

export default router;

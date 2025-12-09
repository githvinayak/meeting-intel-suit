import express, { Router } from 'express';
import {
  createCommitment,
  getCommitments,
  getCommitmentById,
  getCommitmentFollowUps,
  updateCommitmentStatus,
  updateCommitment,
  deleteCommitment,
  getOverdue,
  getCompletionRateController,
  getCommitmentStatsController,
  addFollowUp,
} from '../controllers/commitmentController';

const router: Router = express.Router();

/**
 * @swagger
 * /api/v1/commitments/from-action-item:
 *   post:
 *     summary: Create commitment from action item
 *     tags: [Commitments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meetingId
 *               - actionItemId
 *             properties:
 *               meetingId:
 *                 type: string
 *                 description: Meeting ID
 *               actionItemId:
 *                 type: string
 *                 description: Action item ID to convert to commitment
 *     responses:
 *       201:
 *         description: Commitment created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/commitments/from-action-item', createCommitment);

/**
 * @swagger
 * /api/v1/commitments:
 *   get:
 *     summary: Get all commitments for user
 *     tags: [Commitments]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, completed, overdue, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [high, medium, low]
 *         description: Filter by priority
 *       - in: query
 *         name: assignedToName
 *         schema:
 *           type: string
 *         description: Filter by assignee name
 *     responses:
 *       200:
 *         description: List of commitments
 *       500:
 *         description: Server error
 */
router.get('/commitments', getCommitments);

/**
 * @swagger
 * /api/v1/commitments/stats:
 *   get:
 *     summary: Get commitment statistics
 *     tags: [Commitments]
 *     responses:
 *       200:
 *         description: Commitment statistics including total, completed, overdue, completion rate
 *       500:
 *         description: Server error
 */
router.get('/commitments/stats', getCommitmentStatsController);

/**
 * @swagger
 * /api/v1/commitments/overdue:
 *   get:
 *     summary: Get overdue commitments
 *     tags: [Commitments]
 *     responses:
 *       200:
 *         description: List of overdue commitments
 *       500:
 *         description: Server error
 */
router.get('/commitments/overdue', getOverdue);

/**
 * @swagger
 * /api/v1/commitments/completion-rate:
 *   get:
 *     summary: Get completion rate for a person
 *     tags: [Commitments]
 *     parameters:
 *       - in: query
 *         name: assignedToName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of person to get completion rate for
 *     responses:
 *       200:
 *         description: Completion rate statistics
 *       400:
 *         description: Missing assignedToName parameter
 *       500:
 *         description: Server error
 */
router.get('/commitments/completion-rate', getCompletionRateController);

/**
 * @swagger
 * /api/v1/commitments/{id}:
 *   get:
 *     summary: Get commitment by ID
 *     tags: [Commitments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Commitment ID
 *     responses:
 *       200:
 *         description: Commitment details
 *       404:
 *         description: Commitment not found
 *       500:
 *         description: Server error
 *   patch:
 *     summary: Update commitment details
 *     tags: [Commitments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Commitment ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               assignedToName:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               priority:
 *                 type: string
 *                 enum: [high, medium, low]
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed, overdue, cancelled]
 *     responses:
 *       200:
 *         description: Commitment updated
 *       404:
 *         description: Commitment not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete commitment
 *     tags: [Commitments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Commitment ID
 *     responses:
 *       200:
 *         description: Commitment deleted
 *       404:
 *         description: Commitment not found
 *       500:
 *         description: Server error
 */
router.get('/commitments/:id', getCommitmentById);
router.patch('/commitments/:id', updateCommitment);
router.delete('/commitments/:id', deleteCommitment);

/**
 * @swagger
 * /api/v1/commitments/{id}/status:
 *   patch:
 *     summary: Update commitment status
 *     tags: [Commitments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Commitment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed, overdue, cancelled]
 *                 description: New status
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Commitment not found
 *       500:
 *         description: Server error
 */
router.patch('/commitments/:id/status', updateCommitmentStatus);

/**
 * @swagger
 * /api/v1/commitments/{id}/follow-ups:
 *   get:
 *     summary: Get commitment follow-up history
 *     tags: [Commitments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Commitment ID
 *     responses:
 *       200:
 *         description: Commitment history with all follow-ups across meetings
 *       404:
 *         description: Commitment not found
 *       500:
 *         description: Server error
 *   post:
 *     summary: Manually add follow-up to commitment
 *     tags: [Commitments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Commitment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meetingId
 *               - status
 *             properties:
 *               meetingId:
 *                 type: string
 *                 description: Meeting where commitment was mentioned
 *               status:
 *                 type: string
 *                 enum: [mentioned, updated, completed]
 *                 description: Status of the follow-up
 *               notes:
 *                 type: string
 *                 description: Additional notes about the follow-up
 *     responses:
 *       201:
 *         description: Follow-up added successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Commitment not found
 *       500:
 *         description: Server error
 */
router.get('/commitments/:id/follow-ups', getCommitmentFollowUps);
router.post('/commitments/:id/follow-ups', addFollowUp);

export default router;

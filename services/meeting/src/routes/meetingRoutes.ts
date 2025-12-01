import express, { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  createMeeting,
  getMeetingById,
  getMeetingStatus,
  listMeetings,
} from '../controllers/meetingController';

const router: Router = express.Router();

/**
 * @swagger
 * /api/meetings:
 *   post:
 *     summary: Create a new meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMeetingInput'
 *     responses:
 *       201:
 *         description: Meeting created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Meeting created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     meeting:
 *                       $ref: '#/components/schemas/Meeting'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.post('/meetings', authenticate, createMeeting);

/**
 * @swagger
 * /api/meetings:
 *   get:
 *     summary: List all meetings for authenticated user
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled]
 *         description: Filter by meeting status
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filter by project ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of meetings to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of meetings to skip (pagination)
 *     responses:
 *       200:
 *         description: List of meetings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     meetings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Meeting'
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     skip:
 *                       type: integer
 *                       example: 0
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.get('/meetings', authenticate, listMeetings);

/**
 * @swagger
 * /api/meetings/{id}:
 *   get:
 *     summary: Get meeting by ID
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     meeting:
 *                       $ref: '#/components/schemas/Meeting'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - No access to this meeting
 *       404:
 *         description: Meeting not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, getMeetingById);

/**
 * @swagger
 * /api/meetings/{id}/status:
 *   get:
 *     summary: Get meeting processing status
 *     description: Returns the current processing status and job progress for a meeting
 *     tags:
 *       - Meetings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *         example: "674a5b3c8d9e1f2a3b4c5d6e"
 *     responses:
 *       200:
 *         description: Meeting status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     meetingId:
 *                       type: string
 *                     meetingStatus:
 *                       type: string
 *                       enum: [scheduled, pending, processing, completed, cancelled]
 *                     statusMessage:
 *                       type: string
 *                       example: "Processing in progress"
 *                     overallProgress:
 *                       type: number
 *                       example: 33
 *                     jobs:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         active:
 *                           type: number
 *                         waiting:
 *                           type: number
 *                         failed:
 *                           type: number
 *       404:
 *         description: Meeting not found
 */
router.get('/:id/status', getMeetingStatus);

export default router;

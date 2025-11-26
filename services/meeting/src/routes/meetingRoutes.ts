import express, { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { createMeeting, getMeetingById, listMeetings } from '../controllers/meetingController';

const router: Router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Meeting:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         id:
 *           type: string
 *           description: Meeting ID
 *         title:
 *           type: string
 *           description: Meeting title
 *           maxLength: 200
 *         description:
 *           type: string
 *           description: Meeting description
 *           maxLength: 1000
 *         fileUrl:
 *           type: string
 *           format: uri
 *           description: URL to meeting recording/file
 *         transcript:
 *           type: string
 *           description: Meeting transcript
 *         actionItems:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               description:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [pending, completed]
 *         decisions:
 *           type: array
 *           items:
 *             type: object
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *         status:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled]
 *         sentiment:
 *           type: object
 *           properties:
 *             overall:
 *               type: string
 *               enum: [positive, neutral, negative]
 *             score:
 *               type: number
 *               minimum: -1
 *               maximum: 1
 *             emotions:
 *               type: object
 *               properties:
 *                 joy:
 *                   type: number
 *                 frustration:
 *                   type: number
 *                 stress:
 *                   type: number
 *                 engagement:
 *                   type: number
 *             burnoutIndicators:
 *               type: object
 *               properties:
 *                 score:
 *                   type: number
 *                 factors:
 *                   type: array
 *                   items:
 *                     type: string
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *         relatedMeetings:
 *           type: array
 *           items:
 *             type: string
 *         projectId:
 *           type: string
 *         createdBy:
 *           type: string
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *         startedAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateMeetingInput:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           example: "Q1 Planning Meeting"
 *         description:
 *           type: string
 *           maxLength: 1000
 *           example: "Quarterly planning and goal setting"
 *         fileUrl:
 *           type: string
 *           format: uri
 *           example: "https://example.com/recording.mp4"
 *         transcript:
 *           type: string
 *           example: "Meeting transcript content..."
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               userId:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:00:00Z"
 *         projectId:
 *           type: string
 *           example: "proj_123"
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         errors:
 *           type: array
 *           items:
 *             type: object
 */

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
router.post(
    '/',
    authenticate,
    createMeeting
);

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
router.get(
    '/',
    authenticate,
    listMeetings
);

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
router.get(
    '/:id',
    authenticate,
    getMeetingById
);

export default router;
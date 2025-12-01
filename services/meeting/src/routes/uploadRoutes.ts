import express, { Router } from 'express';
import { upload, handleMulterError } from '../middleware/upload';
import { attachFile, uploadFile } from '../controllers/uploadCotroller';

const router: Router = express.Router();

/**
 * @swagger
 * /api/meetings/upload:
 *   post:
 *     summary: Upload file and create new meeting
 *     description: Upload an audio/video file to create a new meeting. File is stored in Cloudinary and meeting status is set to 'pending'.
 *     tags:
 *       - Meetings
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Audio or video file (mp3, mp4, wav, m4a, webm)
 *               title:
 *                 type: string
 *                 description: Optional meeting title
 *                 example: "Weekly Team Standup"
 *     responses:
 *       201:
 *         description: File uploaded successfully and meeting created
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
 *                   example: "File uploaded successfully. Meeting created."
 *                 data:
 *                   type: object
 *                   properties:
 *                     meetingId:
 *                       type: string
 *                       example: "674a5b3c8d9e1f2a3b4c5d6e"
 *                     fileUrl:
 *                       type: string
 *                       example: "https://res.cloudinary.com/demo/video/upload/meeting.mp3"
 *                     fileName:
 *                       type: string
 *                       example: "standup-recording.mp3"
 *                     fileSize:
 *                       type: number
 *                       example: 15728640
 *                     status:
 *                       type: string
 *                       example: "pending"
 *       400:
 *         description: Bad request - No file provided or file too large
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "File size exceeds 500MB limit"
 *       500:
 *         description: Server error
 */
router.post('/upload', upload.single('file'), handleMulterError, uploadFile);

/**
 * @swagger
 * /api/meetings/{id}/upload:
 *   patch:
 *     summary: Attach file to existing meeting
 *     description: Upload an audio/video file to an existing meeting. Updates meeting status to 'pending' and stores file URL. This is the primary workflow for scheduled meetings.
 *     tags:
 *       - Meetings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID (MongoDB ObjectId)
 *         example: "674a5b3c8d9e1f2a3b4c5d6e"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Audio or video file (mp3, mp4, wav, m4a, webm). Max size 500MB.
 *     responses:
 *       200:
 *         description: File attached successfully
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
 *                   example: "File attached to meeting successfully. Status updated to pending."
 *                 data:
 *                   type: object
 *                   properties:
 *                     meetingId:
 *                       type: string
 *                       example: "674a5b3c8d9e1f2a3b4c5d6e"
 *                     fileUrl:
 *                       type: string
 *                       example: "https://res.cloudinary.com/demo/video/upload/meeting.mp3"
 *                     fileName:
 *                       type: string
 *                       example: "standup-recording.mp3"
 *                     fileSize:
 *                       type: number
 *                       example: 15728640
 *                     status:
 *                       type: string
 *                       example: "pending"
 *       400:
 *         description: Bad request - Invalid meeting ID or file issues
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid meeting ID format. Must be a valid MongoDB ObjectId."
 *       403:
 *         description: Forbidden - User doesn't own the meeting
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You do not have permission to upload files to this meeting"
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Meeting not found with the provided ID"
 *       409:
 *         description: Conflict - Meeting already has a file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "This meeting already has a file attached"
 *       500:
 *         description: Server error
 */
router.patch('/:id/upload', upload.single('file'), handleMulterError, attachFile);


export default router;

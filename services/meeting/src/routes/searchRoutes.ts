import express, { Router } from 'express';
import {
  searchMeetingsController,
  getMeetingStatsController,
  getRecentMeetingsController,
  exportMeetingToPDF,
  exportMeetingToMarkdown,
  exportMeetingActionItemsToCSV,
  exportMeetingsToCSVController,
} from '../controllers/searchController';
import {
  getAllActionItems,
  getMeetingActionItems,
  updateActionItem,
  completeActionItem,
  deleteActionItem,
  addActionItem,
  getActionItemStats,
} from '../controllers/actionItemController';

const router: Router = express.Router();

/**
 * @swagger
 * /api/v1/meetings/search:
 *   get:
 *     summary: Search meetings with advanced filters
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Full-text search in title, description, transcript
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated status values (scheduled,pending,completed)
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (YYYY-MM-DD)
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: string
 *         description: Comma-separated sentiment values (positive,neutral,negative)
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filter by project ID
 *       - in: query
 *         name: hasActionItems
 *         schema:
 *           type: boolean
 *         description: Only meetings with action items
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Search results with pagination
 *       500:
 *         description: Server error
 */
router.get('/meetings/search', searchMeetingsController);

/**
 * @swagger
 * /api/v1/meetings/stats:
 *   get:
 *     summary: Get meeting statistics
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Meeting statistics including completion rates, sentiment breakdown, burnout scores
 *       500:
 *         description: Server error
 */
router.get('/meetings/stats', getMeetingStatsController);

/**
 * @swagger
 * /api/v1/meetings/recent:
 *   get:
 *     summary: Get recent meetings
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent meetings to return
 *     responses:
 *       200:
 *         description: List of recent meetings
 *       500:
 *         description: Server error
 */
router.get('/meetings/recent', getRecentMeetingsController);

/**
 * @swagger
 * /api/v1/meetings/{id}/export/pdf:
 *   get:
 *     summary: Export meeting to PDF
 *     tags: [Export]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Meeting not found
 *       500:
 *         description: Server error
 */
router.get('/meetings/:id/export/pdf', exportMeetingToPDF);

/**
 * @swagger
 * /api/v1/meetings/{id}/export/markdown:
 *   get:
 *     summary: Export meeting to Markdown
 *     tags: [Export]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Markdown file download
 *         content:
 *           text/markdown:
 *             schema:
 *               type: string
 *       404:
 *         description: Meeting not found
 *       500:
 *         description: Server error
 */
router.get('/meetings/:id/export/markdown', exportMeetingToMarkdown);

/**
 * @swagger
 * /api/v1/meetings/{id}/export/csv:
 *   get:
 *     summary: Export meeting action items to CSV
 *     tags: [Export]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       404:
 *         description: Meeting not found
 *       500:
 *         description: Server error
 */
router.get('/meetings/:id/export/csv', exportMeetingActionItemsToCSV);

/**
 * @swagger
 * /api/v1/meetings/export/csv:
 *   post:
 *     summary: Export multiple meetings to CSV
 *     tags: [Export]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meetingIds
 *             properties:
 *               meetingIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of meeting IDs to export
 *     responses:
 *       200:
 *         description: CSV file download
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/meetings/export/csv', exportMeetingsToCSVController);

/**
 * @swagger
 * /api/v1/action-items:
 *   get:
 *     summary: Get all action items across meetings
 *     tags: [Action Items]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, completed]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [high, medium, low]
 *         description: Filter by priority
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assignee name
 *     responses:
 *       200:
 *         description: List of action items
 *       500:
 *         description: Server error
 */
router.get('/action-items', getAllActionItems);

/**
 * @swagger
 * /api/v1/action-items/stats:
 *   get:
 *     summary: Get action item statistics
 *     tags: [Action Items]
 *     responses:
 *       200:
 *         description: Action item statistics including total, completed, overdue counts
 *       500:
 *         description: Server error
 */
router.get('/action-items/stats', getActionItemStats);

/**
 * @swagger
 * /api/v1/meetings/{meetingId}/action-items:
 *   get:
 *     summary: Get action items for a specific meeting
 *     tags: [Action Items]
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: List of action items for the meeting
 *       404:
 *         description: Meeting not found
 *       500:
 *         description: Server error
 *   post:
 *     summary: Add new action item to meeting
 *     tags: [Action Items]
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: Action item description
 *               assignedTo:
 *                 type: string
 *                 description: Person assigned to the action item
 *               priority:
 *                 type: string
 *                 enum: [high, medium, low]
 *                 default: medium
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 description: Due date (YYYY-MM-DD)
 *     responses:
 *       201:
 *         description: Action item created successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Meeting not found
 *       500:
 *         description: Server error
 */
router.get('/meetings/:meetingId/action-items', getMeetingActionItems);
router.post('/meetings/:meetingId/action-items', addActionItem);

/**
 * @swagger
 * /api/v1/meetings/{meetingId}/action-items/{itemId}:
 *   patch:
 *     summary: Update action item
 *     tags: [Action Items]
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed]
 *               priority:
 *                 type: string
 *                 enum: [high, medium, low]
 *               assignedTo:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Action item updated
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete action item
 *     tags: [Action Items]
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action item deleted
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.patch('/meetings/:meetingId/action-items/:itemId', updateActionItem);
router.delete('/meetings/:meetingId/action-items/:itemId', deleteActionItem);

/**
 * @swagger
 * /api/v1/meetings/{meetingId}/action-items/{itemId}/complete:
 *   post:
 *     summary: Mark action item as completed
 *     tags: [Action Items]
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action item marked as completed
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.post('/meetings/:meetingId/action-items/:itemId/complete', completeActionItem);

export default router;

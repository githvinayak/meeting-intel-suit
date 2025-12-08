import { Request, Response } from 'express';
import { Meeting } from '../models/Meeting';
import { ExportService } from '../services/exportService';
import { SearchService } from '../services/searchService';

const searchService = new SearchService();
const exportService = new ExportService();
/**
 * Search meetings with filters
 * GET /api/v1/meetings/search
 */
export const searchMeetingsController = async (req: Request, res: Response) => {
  try {
    const {
      query,
      status,
      dateFrom,
      dateTo,
      sentiment,
      projectId,
      hasActionItems,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    // Parse filters
    const filters: any = {
      query: query as string,
      status: status ? (status as string).split(',') : undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      sentiment: sentiment ? (sentiment as string).split(',') : undefined,
      createdBy: (req as any).user?.userId, // From auth middleware
      projectId: projectId as string,
      hasActionItems: hasActionItems === 'true',
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sortBy: (sortBy as string) || 'createdAt',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await searchService.searchMeetings(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get meeting statistics
 * GET /api/v1/meetings/stats
 */
export const getMeetingStatsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const stats = await searchService.getMeetingStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get recent meetings
 * GET /api/v1/meetings/recent
 */
export const getRecentMeetingsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const meetings = await searchService.getRecentMeetings(userId, limit);

    res.json({
      success: true,
      data: meetings,
    });
  } catch (error: any) {
    console.error('Recent meetings error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Export meeting to PDF
 * GET /api/v1/meetings/:id/export/pdf
 */
export const exportMeetingToPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const meeting = await Meeting.findOne({ _id: id, createdBy: userId });
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    const pdfBuffer = await exportService.exportToPDF(meeting);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${meeting.title}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Export meeting to Markdown
 * GET /api/v1/meetings/:id/export/markdown
 */
export const exportMeetingToMarkdown = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const meeting = await Meeting.findOne({ _id: id, createdBy: userId });
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    const markdown = exportService.exportToMarkdown(meeting);

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${meeting.title}.md"`);
    res.send(markdown);
  } catch (error: any) {
    console.error('Markdown export error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Export action items to CSV
 * GET /api/v1/meetings/:id/export/csv
 */
export const exportMeetingActionItemsToCSV = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const meeting = await Meeting.findOne({ _id: id, createdBy: userId });
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    const csv = exportService.exportActionItemsToCSV(meeting);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${meeting.title}-action-items.csv"`
    );
    res.send(csv);
  } catch (error: any) {
    console.error('CSV export error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Export multiple meetings to CSV
 * POST /api/v1/meetings/export/csv
 */
export const exportMeetingsToCSVController = async (req: Request, res: Response) => {
  try {
    const { meetingIds } = req.body;
    const userId = (req as any).user?.userId;

    if (!meetingIds || !Array.isArray(meetingIds)) {
      return res.status(400).json({
        success: false,
        error: 'meetingIds array is required',
      });
    }

    const meetings = await Meeting.find({
      _id: { $in: meetingIds },
      createdBy: userId,
    });

    const csv = exportService.exportMeetingsToCSV(meetings);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="meetings.csv"');
    res.send(csv);
  } catch (error: any) {
    console.error('CSV export error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

import { Request, Response } from 'express';
import { Meeting } from '../models/Meeting';
import mongoose from 'mongoose';

/**
 * Get all action items for a user
 * GET /api/v1/action-items
 */
export const getAllActionItems = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { status, priority, assignedTo } = req.query;

    // Build query
    const query: any = { createdBy: new mongoose.Types.ObjectId(userId) };

    // Find meetings with action items
    const meetings = await Meeting.find(query).select('title actionItems createdAt');

    // Flatten action items from all meetings
    let allActionItems: any[] = [];
    meetings.forEach((meeting) => {
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        meeting.actionItems.forEach((item) => {
          allActionItems.push({
            ...item,
            meetingId: meeting._id,
            meetingTitle: meeting.title,
            meetingDate: meeting.createdAt,
          });
        });
      }
    });

    // Apply filters
    if (status) {
      allActionItems = allActionItems.filter((item) => item.status === status);
    }
    if (priority) {
      allActionItems = allActionItems.filter((item) => item.priority === priority);
    }
    if (assignedTo) {
      allActionItems = allActionItems.filter((item) =>
        item.assignedTo?.toLowerCase().includes((assignedTo as string).toLowerCase())
      );
    }

    res.json({
      success: true,
      data: {
        actionItems: allActionItems,
        total: allActionItems.length,
      },
    });
  } catch (error: any) {
    console.error('Get action items error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get action items for a specific meeting
 * GET /api/v1/meetings/:meetingId/action-items
 */
export const getMeetingActionItems = async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = (req as any).user?.userId;

    const meeting = await Meeting.findOne({
      _id: meetingId,
      createdBy: userId,
    }).select('title actionItems');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    res.json({
      success: true,
      data: {
        meetingId: meeting._id,
        meetingTitle: meeting.title,
        actionItems: meeting.actionItems || [],
      },
    });
  } catch (error: any) {
    console.error('Get meeting action items error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Update action item status
 * PATCH /api/v1/meetings/:meetingId/action-items/:itemId
 */
export const updateActionItem = async (req: Request, res: Response) => {
  try {
    const { meetingId, itemId } = req.params;
    const userId = (req as any).user?.userId;
    const { status, priority, assignedTo, dueDate } = req.body;

    const meeting = await Meeting.findOne({
      _id: meetingId,
      createdBy: userId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    // Find action item
    const actionItem = meeting.actionItems.find((item) => item.id === itemId);
    if (!actionItem) {
      return res.status(404).json({
        success: false,
        error: 'Action item not found',
      });
    }

    // Update fields
    if (status !== undefined) {
      actionItem.status = status;
    }
    if (priority !== undefined) {
      actionItem.priority = priority;
    }
    if (assignedTo !== undefined) {
      actionItem.assignedTo = assignedTo;
    }
    if (dueDate !== undefined) {
      actionItem.dueDate = dueDate ? new Date(dueDate) : undefined;
    }

    await meeting.save();

    res.json({
      success: true,
      message: 'Action item updated successfully',
      data: actionItem,
    });
  } catch (error: any) {
    console.error('Update action item error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Mark action item as completed
 * POST /api/v1/meetings/:meetingId/action-items/:itemId/complete
 */
export const completeActionItem = async (req: Request, res: Response) => {
  try {
    const { meetingId, itemId } = req.params;
    const userId = (req as any).user?.userId;

    const meeting = await Meeting.findOne({
      _id: meetingId,
      createdBy: userId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    // Find and update action item
    const actionItem = meeting.actionItems.find((item) => item.id === itemId);
    if (!actionItem) {
      return res.status(404).json({
        success: false,
        error: 'Action item not found',
      });
    }

    actionItem.status = 'completed';
    await meeting.save();

    res.json({
      success: true,
      message: 'Action item marked as completed',
      data: actionItem,
    });
  } catch (error: any) {
    console.error('Complete action item error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Delete action item
 * DELETE /api/v1/meetings/:meetingId/action-items/:itemId
 */
export const deleteActionItem = async (req: Request, res: Response) => {
  try {
    const { meetingId, itemId } = req.params;
    const userId = (req as any).user?.userId;

    const meeting = await Meeting.findOne({
      _id: meetingId,
      createdBy: userId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    // Remove action item
    meeting.actionItems = meeting.actionItems.filter((item) => item.id !== itemId);
    await meeting.save();

    res.json({
      success: true,
      message: 'Action item deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete action item error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Add new action item to meeting
 * POST /api/v1/meetings/:meetingId/action-items
 */
export const addActionItem = async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const userId = (req as any).user?.userId;
    const { description, assignedTo, priority, dueDate } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required',
      });
    }

    const meeting = await Meeting.findOne({
      _id: meetingId,
      createdBy: userId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    // Create new action item
    const newActionItem = {
      id: new mongoose.Types.ObjectId().toString(),
      description,
      assignedTo: assignedTo || undefined,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: 'pending' as const,
      extractedAt: new Date(),
    };

    meeting.actionItems.push(newActionItem);
    await meeting.save();

    res.status(201).json({
      success: true,
      message: 'Action item added successfully',
      data: newActionItem,
    });
  } catch (error: any) {
    console.error('Add action item error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get action item statistics
 * GET /api/v1/action-items/stats
 */
export const getActionItemStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const meetings = await Meeting.find({ createdBy: userId }).select('actionItems');

    let total = 0;
    let completed = 0;
    let pending = 0;
    let inProgress = 0;
    let overdue = 0;
    const now = new Date();

    meetings.forEach((meeting) => {
      meeting.actionItems.forEach((item) => {
        total++;
        if (item.status === 'completed') {
          completed++;
        } else if (item.status === 'pending') {
          pending++;
        } else if (item.status === 'in-progress') {
          inProgress++;
        }

        // Check if overdue
        if (item.dueDate && new Date(item.dueDate) < now && item.status !== 'completed') {
          overdue++;
        }
      });
    });

    res.json({
      success: true,
      data: {
        total,
        completed,
        pending,
        inProgress,
        overdue,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
      },
    });
  } catch (error: any) {
    console.error('Action item stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

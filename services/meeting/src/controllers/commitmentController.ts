import { Request, Response } from 'express';
import { Commitment } from '../models/Commitment';
import { CommitmentService } from '../services/commitmentService';
import mongoose from 'mongoose';

/**
 * Create commitment from action item
 * POST /api/v1/commitments/from-action-item
 *
 */
const commitmentService = new CommitmentService();
export const createCommitment = async (req: Request, res: Response) => {
  try {
    const { meetingId, actionItemId } = req.body;
    const userId = (req as any).user?.userId;

    if (!meetingId || !actionItemId) {
      return res.status(400).json({
        success: false,
        error: 'meetingId and actionItemId are required',
      });
    }

    const commitment = await commitmentService.createCommitmentFromActionItem(
      meetingId,
      actionItemId,
      userId
    );

    res.status(201).json({
      success: true,
      message: 'Commitment created successfully',
      data: commitment,
    });
  } catch (error: any) {
    console.error('Create commitment error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get all commitments for a user
 * GET /api/v1/commitments
 */
export const getCommitments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { status, priority, assignedToName } = req.query;

    // Build query
    const query: any = { createdBy: new mongoose.Types.ObjectId(userId) };

    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }
    if (assignedToName) {
      query.assignedToName = { $regex: assignedToName as string, $options: 'i' };
    }

    const commitments = await Commitment.find(query)
      .populate('meetingId', 'title createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        commitments,
        total: commitments.length,
      },
    });
  } catch (error: any) {
    console.error('Get commitments error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get commitment by ID
 * GET /api/v1/commitments/:id
 */
export const getCommitmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const commitment = await Commitment.findOne({
      _id: id,
      createdBy: new mongoose.Types.ObjectId(userId),
    })
      .populate('meetingId', 'title createdAt')
      .populate('followUps.meetingId', 'title createdAt');

    if (!commitment) {
      return res.status(404).json({
        success: false,
        error: 'Commitment not found',
      });
    }

    res.json({
      success: true,
      data: commitment,
    });
  } catch (error: any) {
    console.error('Get commitment error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get commitment follow-up history
 * GET /api/v1/commitments/:id/follow-ups
 */
export const getCommitmentFollowUps = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const history = await commitmentService.getCommitmentHistory(id);

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('Get follow-ups error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Update commitment status
 * PATCH /api/v1/commitments/:id/status
 */
export const updateCommitmentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = (req as any).user?.userId;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const commitment = await Commitment.findOne({
      _id: id,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    if (!commitment) {
      return res.status(404).json({
        success: false,
        error: 'Commitment not found',
      });
    }

    commitment.status = status;
    if (status === 'completed') {
      commitment.completedAt = new Date();
    }
    await commitment.save();

    res.json({
      success: true,
      message: 'Commitment status updated',
      data: commitment,
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Update commitment details
 * PATCH /api/v1/commitments/:id
 */
export const updateCommitment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, assignedToName, dueDate, priority, status } = req.body;
    const userId = (req as any).user?.userId;

    const commitment = await Commitment.findOne({
      _id: id,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    if (!commitment) {
      return res.status(404).json({
        success: false,
        error: 'Commitment not found',
      });
    }

    // Update fields
    if (description !== undefined) commitment.description = description;
    if (assignedToName !== undefined) commitment.assignedToName = assignedToName;
    if (dueDate !== undefined) commitment.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (priority !== undefined) commitment.priority = priority;
    if (status !== undefined) {
      commitment.status = status;
      if (status === 'completed') {
        commitment.completedAt = new Date();
      }
    }

    await commitment.save();

    res.json({
      success: true,
      message: 'Commitment updated successfully',
      data: commitment,
    });
  } catch (error: any) {
    console.error('Update commitment error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Delete commitment
 * DELETE /api/v1/commitments/:id
 */
export const deleteCommitment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const result = await Commitment.findOneAndDelete({
      _id: id,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Commitment not found',
      });
    }

    res.json({
      success: true,
      message: 'Commitment deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete commitment error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get overdue commitments
 * GET /api/v1/commitments/overdue
 */
export const getOverdue = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const overdueCommitments = await commitmentService.getOverdueCommitments(userId);

    res.json({
      success: true,
      data: {
        commitments: overdueCommitments,
        total: overdueCommitments.length,
      },
    });
  } catch (error: any) {
    console.error('Get overdue error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get completion rate for a person
 * GET /api/v1/commitments/completion-rate
 */
export const getCompletionRateController = async (req: Request, res: Response) => {
  try {
    const { assignedToName } = req.query;

    if (!assignedToName) {
      return res.status(400).json({
        success: false,
        error: 'assignedToName query parameter is required',
      });
    }

    const stats = await commitmentService.getCompletionRate(assignedToName as string);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get completion rate error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get commitment statistics
 * GET /api/v1/commitments/stats
 */
export const getCommitmentStatsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const stats = await commitmentService.getCommitmentStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get commitment stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Manually add follow-up to commitment
 * POST /api/v1/commitments/:id/follow-ups
 */
export const addFollowUp = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { meetingId, status, notes } = req.body;
    const userId = (req as any).user?.userId;

    if (!meetingId || !status) {
      return res.status(400).json({
        success: false,
        error: 'meetingId and status are required',
      });
    }

    const commitment = await Commitment.findOne({
      _id: id,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    if (!commitment) {
      return res.status(404).json({
        success: false,
        error: 'Commitment not found',
      });
    }

    await commitment.addFollowUp(new mongoose.Types.ObjectId(meetingId), status, notes, 'manual');

    res.status(201).json({
      success: true,
      message: 'Follow-up added successfully',
      data: commitment,
    });
  } catch (error: any) {
    console.error('Add follow-up error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

import { Request, Response } from 'express';
import { Meeting } from '../models/Meeting';
import { JobOrchestrator } from '../orchestration/jobOrchestrator';
/**
 * GET /api/meetings/:id/status
 * Get processing status and job progress for a meeting
 */
export const getMeetingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: meetingId } = req.params;

    // Find meeting
    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
      return;
    }

    // Get pipeline status from orchestrator
    const pipelineStatus = await JobOrchestrator.getPipelineStatus(meetingId);

    // Calculate overall progress based on pipeline
    let overallProgress = 0;
    let statusMessage = '';

    if (meeting.status === 'completed' || meeting.status === 'transcribed') {
      overallProgress = 100;
      statusMessage = 'All processing completed';
    } else if (meeting.status === 'processing') {
      // Base progress on transcription job
      overallProgress = pipelineStatus.transcription?.progress || 50;
      statusMessage = 'Transcription in progress';
    } else if (meeting.status === 'pending') {
      overallProgress = 0;
      statusMessage = 'Waiting in queue';
    } else if (meeting.status === 'failed') {
      overallProgress = 0;
      statusMessage = 'Processing failed';
    } else {
      overallProgress = 0;
      statusMessage = 'Ready';
    }

    res.status(200).json({
      success: true,
      data: {
        meetingId: meeting._id,
        meetingStatus: meeting.status,
        statusMessage,
        overallProgress,
        processing: meeting.processing, // Cost, model, errors
        transcript: meeting.transcript, // Transcription result
        pipeline: pipelineStatus, // Individual job statuses
      },
    });
  } catch (error: any) {
    console.error('Get meeting status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get meeting status',
      error: error.message,
    });
  }
};

/**
 * GET /api/queue/stats
 * Get overall queue statistics (monitoring dashboard)
 */
export const getQueueStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Import transcriptionQueue dynamically to avoid circular deps
    const { transcriptionQueue } = await import('../queue/transcriptionQueue');
    const { extractionQueue } = await import('../queue/extractionQueue');
    const { sentimentQueue } = await import('../queue/sentimentQueue');

    // Get queue stats
    const transcriptionStats = await transcriptionQueue.getStats();
    const extractionStats = await extractionQueue.getStats();
    const sentimentStats = await sentimentQueue.getStats();

    res.status(200).json({
      success: true,
      data: {
        transcription: transcriptionStats,
        // TODO (Day 12+): Add other queue stats
        extraction: extractionStats,
        sentiment: sentimentStats,
        // timeline: await timelineQueue.getStats(),
      },
    });
  } catch (error: any) {
    console.error('Get queue stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics',
      error: error.message,
    });
  }
};

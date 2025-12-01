import { Request, Response } from 'express';

export const getQueueStats = async (_req: Request, res: Response) => {
  try {
    const { default: aiQueue } = await import('../queue/aiQueue');

    // Get job counts by state
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      aiQueue.getWaitingCount(),
      aiQueue.getActiveCount(),
      aiQueue.getCompletedCount(),
      aiQueue.getFailedCount(),
      aiQueue.getDelayedCount(),
    ]);

    // Get recent jobs
    const recentCompleted = await aiQueue.getCompleted(0, 9); // Last 10
    const recentFailed = await aiQueue.getFailed(0, 9); // Last 10

    return res.status(200).json({
      success: true,
      data: {
        counts: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed,
        },
        recentCompleted: recentCompleted.map((job) => ({
          id: job.id,
          type: job.name,
          meetingId: job.data.meetingId,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        })),
        recentFailed: recentFailed.map((job) => ({
          id: job.id,
          type: job.name,
          meetingId: job.data.meetingId,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get queue stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics',
      error: error.message,
    });
  }
};

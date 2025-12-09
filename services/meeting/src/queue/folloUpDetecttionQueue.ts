import Queue from 'bull';
import { config } from '../config/config';

export interface FollowUpDetectionJobData {
  meetingId: string;
  transcript: string;
  userId?: string;
}

export class FollowUpDetectionQueue {
  private queue: Queue.Queue<FollowUpDetectionJobData>;

  constructor() {
    this.queue = new Queue<FollowUpDetectionJobData>('follow-up-detection', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        attempts: 2, // Only 2 attempts (not critical)
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }

  StartWorker(): void {
    this.queue.on('completed', (job, result) => {
      console.log(`✅ Extraction job ${job.id} completed for meeting ${job.data.meetingId}`);
    });

    this.queue.on('failed', (job, err) => {
      console.error(
        `❌ Extraction job ${job?.id} failed for meeting ${job?.data.meetingId}:`,
        err.message
      );
    });

    this.queue.on('stalled', (job) => {
      console.warn(`⚠️ Extraction job ${job.id} stalled for meeting ${job.data.meetingId}`);
    });

    this.queue.on('error', (error) => {
      console.error('❌ Extraction queue error:', error);
    });
  }

  /**
   * Add follow-up detection job to queue
   */
  async addJob(data: FollowUpDetectionJobData): Promise<void> {
    try {
      const job = await this.queue.add(data, {
        priority: 4, // Lower priority than sentiment (optional feature)
      });

      console.log(`🔍 Follow-up detection job ${job.id} queued for meeting ${data.meetingId}`);
    } catch (error) {
      console.error('Failed to add follow-up detection job:', error);
      // Don't throw - this is optional
      console.log('⚠️ Continuing without follow-up detection');
    }
  }

  async getJobStatus(jobId: string): Promise<any> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
    };
  }
  /**
   * Get queue instance for worker
   */
  getQueue(): Queue.Queue<FollowUpDetectionJobData> {
    return this.queue;
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      queue: 'follow-up-detection',
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Clean up old jobs
   */
  async cleanup(): Promise<void> {
    await this.queue.clean(24 * 60 * 60 * 1000);
    console.log('🧹 Follow-up detection queue cleaned');
  }

  /**
   * Close queue gracefully
   */
  async close(): Promise<void> {
    await this.queue.close();
    console.log('👋 Follow-up detection queue closed');
  }
}

export const followUpDetectionQueue = new FollowUpDetectionQueue();

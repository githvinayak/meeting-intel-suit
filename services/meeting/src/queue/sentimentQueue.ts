import Queue from 'bull';
import { config } from '../config/config';

// Job data structure for sentiment analysis
export interface SentimentJobData {
  meetingId: string;
  transcript: string;
  participants: string[]; // List of participant names
  userId?: string;
}

class SentimentQueue {
  private queue: Queue.Queue<SentimentJobData>;

  constructor() {
    this.queue = new Queue<SentimentJobData>('sentiment', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }

  StartWorker(): void {
    this.queue.on('completed', (job, result) => {
      console.log(`✅ Sentiment job ${job.id} completed for meeting ${job.data.meetingId}`);
    });

    this.queue.on('failed', (job, err) => {
      console.error(
        `❌ Sentiment job ${job?.id} failed for meeting ${job?.data.meetingId}:`,
        err.message
      );
    });

    this.queue.on('stalled', (job) => {
      console.warn(`⚠️ Sentiment job ${job.id} stalled for meeting ${job.data.meetingId}`);
    });

    this.queue.on('error', (error) => {
      console.error('❌ Sentiment queue error:', error);
    });
  }

  /**
   * Add sentiment analysis job to queue
   */
  async addJob(data: SentimentJobData): Promise<void> {
    try {
      const job = await this.queue.add(data, {
        priority: 3, // Lower priority than extraction
      });

      console.log(`🎭 Sentiment job ${job.id} queued for meeting ${data.meetingId}`);
    } catch (error) {
      console.error('Failed to add sentiment job:', error);
      throw error;
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
      queue: 'sentiment',
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  getQueue(): Queue.Queue<SentimentJobData> {
    return this.queue;
  }
  /**
   * Clean up old jobs
   */
  async cleanup(): Promise<void> {
    await this.queue.clean(24 * 60 * 60 * 1000);
    console.log('🧹 Sentiment queue cleaned');
  }

  /**
   * Close queue gracefully
   */
  async close(): Promise<void> {
    await this.queue.close();
    console.log('👋 Sentiment queue closed');
  }
}

// Export singleton instance
export const sentimentQueue = new SentimentQueue();

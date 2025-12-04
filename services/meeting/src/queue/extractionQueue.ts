import Queue from 'bull';
import { config } from '../config/config';

// Job data structure for extraction
export interface ExtractionJobData {
  meetingId: string;
  transcript: string;
  userId: string;
}

class ExtractionQueue {
  private queue: Queue.Queue<ExtractionJobData>;

  constructor() {
    this.queue = new Queue<ExtractionJobData>('extraction', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200, // Keep last 200 failed jobs
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
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
   * Add extraction job to queue
   */
  async addJob(data: ExtractionJobData): Promise<void> {
    try {
      const job = await this.queue.add(data, {
        priority: 2, // Higher priority than sentiment (which will be 3)
      });

      console.log(`📋 Extraction job ${job.id} queued for meeting ${data.meetingId}`);
    } catch (error) {
      console.error('Failed to add extraction job:', error);
      throw error;
    }
  }

  /**
   * Get queue instance for worker
   */
  getQueue(): Queue.Queue<ExtractionJobData> {
    return this.queue;
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
      queue: 'extraction',
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
    await this.queue.clean(24 * 60 * 60 * 1000); // Clean jobs older than 24 hours
    console.log('🧹 Extraction queue cleaned');
  }

  /**
   * Close queue gracefully
   */
  async close(): Promise<void> {
    await this.queue.close();
    console.log('👋 Extraction queue closed');
  }
}

// Export singleton instance
export const extractionQueue = new ExtractionQueue();

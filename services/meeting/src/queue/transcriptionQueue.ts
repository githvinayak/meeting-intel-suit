import Bull, { Job, Queue } from 'bull';
import { TranscriptionJobData } from '../types/jobs';
import { config } from '../config/config';
import { TranscriptionWorker } from '../worker/transcriptionWorker';

class TranscriptionQueue {
  private queue: Queue<TranscriptionJobData>;

  constructor() {
    // Initialize Bull queue
    this.queue = new Bull<TranscriptionJobData>('transcription', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        attempts: 3, // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5s delay, then 10s, 20s
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200, // Keep last 200 failed jobs
      },
    });
  }

  /**
   * Setup event handlers for the queue
   */
  StartWorker(): void {
    console.log('🔧 Starting Transcription worker...');

    // Process jobs
    this.queue.process(config.limits.maxConcurrent || 2, async (job: Job<TranscriptionJobData>) => {
      return TranscriptionWorker.processJob(job);
    });

    // Register event handlers
    this.queue.on('completed', (job: Job<TranscriptionJobData>, result) => {
      TranscriptionWorker.onCompleted(job, result);
    });

    this.queue.on('failed', (job: Job<TranscriptionJobData>, error: Error) => {
      TranscriptionWorker.onFailed(job, error);
    });

    this.queue.on('progress', (job: Job<TranscriptionJobData>, progress: number) => {
      TranscriptionWorker.onProgress(job, progress);
    });

    this.queue.on('stalled', (job: Job<TranscriptionJobData>) => {
      TranscriptionWorker.onStalled(job);
    });

    this.queue.on('error', (error: Error) => {
      console.error('❌ Transcription queue error:', error);
    });

    console.log('✅ Transcription worker started');
  }

  /**
   * Add a transcription job to the queue
   */
  async addJob(data: TranscriptionJobData): Promise<Job<TranscriptionJobData>> {
    console.log(`➕ Adding transcription job to queue: ${data.meetingId}`);

    const job = await this.queue.add(data, {
      jobId: `transcription-${data.meetingId}`, // Unique job ID
      priority: 1, // Higher priority = processed first
    });

    console.log(`✅ Job added with ID: ${job.id}`);
    return job;
  }

  /**
   * Get job status
   */
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
   * Get queue stats
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
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  getQueue(): Queue<TranscriptionJobData> {
    return this.queue;
  }
  /**
   * Clean old jobs
   */
  async cleanup(): Promise<void> {
    await this.queue.clean(24 * 60 * 60 * 1000); // Clean jobs older than 24 hours
    console.log('🧹 Extraction queue cleaned');
  }

  async close(): Promise<void> {
    await this.queue.close();
    console.log('👋 Extraction queue closed');
  }
}

// Export singleton instance
export const transcriptionQueue = new TranscriptionQueue();

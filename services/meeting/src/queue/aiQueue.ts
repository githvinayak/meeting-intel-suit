import Queue from 'bull';
import {
  JobType,
  TranscriptionJobData,
  ExtractionJobData,
  SentimentAnalysisJobData,
  TimelineJobData,
} from '../types/jobs';
import { queueOptions } from '../config/redis';

/**
 * AI Processing Queue
 * Handles all AI-related jobs: transcription, extraction, sentiment, timeline
 */
export const aiQueue = new Queue('ai-processing', queueOptions);

/**
 * Job Priority Levels
 */
export enum JobPriority {
  LOW = 10,
  NORMAL = 5,
  HIGH = 1, // Lower number = higher priority in Bull
  URGENT = 0,
}

/**
 * Add Transcription Job
 */
export const addTranscriptionJob = async (
  data: TranscriptionJobData,
  priority: JobPriority = JobPriority.NORMAL
) => {
  const job = await aiQueue.add(JobType.TRANSCRIPTION, data, {
    priority,
    jobId: `transcription-${data.meetingId}`, // Prevent duplicate jobs
  });

  console.log(`📝 Transcription job created: ${job.id} for meeting ${data.meetingId}`);
  return job;
};

/**
 * Add Extraction Job
 */
export const addExtractionJob = async (
  data: ExtractionJobData,
  priority: JobPriority = JobPriority.NORMAL
) => {
  const job = await aiQueue.add(JobType.EXTRACTION, data, {
    priority,
    jobId: `extraction-${data.meetingId}`,
  });

  console.log(`🔍 Extraction job created: ${job.id} for meeting ${data.meetingId}`);
  return job;
};

/**
 * Add Sentiment Analysis Job
 */
export const addSentimentAnalysisJob = async (
  data: SentimentAnalysisJobData,
  priority: JobPriority = JobPriority.NORMAL
) => {
  const job = await aiQueue.add(JobType.SENTIMENT_ANALYSIS, data, {
    priority,
    jobId: `sentiment-${data.meetingId}`,
  });

  console.log(`😊 Sentiment analysis job created: ${job.id} for meeting ${data.meetingId}`);
  return job;
};

/**
 * Add Timeline Generation Job
 */
export const addTimelineJob = async (
  data: TimelineJobData,
  priority: JobPriority = JobPriority.NORMAL
) => {
  const job = await aiQueue.add(JobType.TIMELINE_GENERATION, data, {
    priority,
    jobId: `timeline-${data.meetingId}`,
  });

  console.log(`⏱️ Timeline job created: ${job.id} for meeting ${data.meetingId}`);
  return job;
};

/**
 * Get job by ID
 */
export const getJob = async (jobId: string) => {
  return await aiQueue.getJob(jobId);
};

/**
 * Get all jobs for a meeting
 */
export const getMeetingJobs = async (meetingId: string) => {
  const jobs = await aiQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
  return jobs.filter((job) => job.data.meetingId === meetingId);
};

/**
 * Queue event listeners
 */
aiQueue.on('completed', (job) => {
  console.log(`✅ Job completed: ${job.id} (${job.name})`);
});

aiQueue.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job?.id} (${job?.name})`, err.message);
});

aiQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job stalled: ${job.id} (${job.name})`);
});

aiQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

export default aiQueue;

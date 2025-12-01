import { Job } from 'bull';

/**
 * Job Types - Different AI processing tasks
 */
export enum JobType {
  TRANSCRIPTION = 'transcription',
  EXTRACTION = 'extraction',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  TIMELINE_GENERATION = 'timeline_generation',
}

/**
 * Base job data interface
 */
interface BaseJobData {
  meetingId: string;
  userId?: string;
  priority?: number;
  createdAt: Date;
}

/**
 * Transcription Job - Convert audio to text
 */
export interface TranscriptionJobData extends BaseJobData {
  fileUrl: string;
  fileSize: number;
  duration?: number;
}

/**
 * Extraction Job - Extract action items, decisions, participants
 */
export interface ExtractionJobData extends BaseJobData {
  transcript: string;
  meetingTitle?: string;
}

/**
 * Sentiment Analysis Job - Analyze emotions, burnout indicators
 */
export interface SentimentAnalysisJobData extends BaseJobData {
  transcript: string;
  participants?: string[];
}

/**
 * Timeline Generation Job - Create timeline of key moments
 */
export interface TimelineJobData extends BaseJobData {
  transcript: string;
  duration: number;
}

/**
 * Union type for all job data
 */
export type AnyJobData =
  | TranscriptionJobData
  | ExtractionJobData
  | SentimentAnalysisJobData
  | TimelineJobData;

/**
 * Job with typed data
 */
export type TypedJob<T = AnyJobData> = Job<T>;

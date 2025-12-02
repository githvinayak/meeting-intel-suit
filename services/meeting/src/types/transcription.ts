export interface TranscriptSegment {
  text: string;
  speaker?: string; // Speaker diarization (future)
  timestamp: number; // Seconds from start
  confidence: number; // 0.0 to 1.0
  sentiment?: 'positive' | 'negative' | 'neutral'; // Future feature
}

export interface TranscriptionResult {
  segments: TranscriptSegment[];
  fullText: string;
  duration: number; // Total audio duration in seconds
  language: string;
  cost: number; // Cost in USD
  model: string; // whisper-1
  processingTime: number; // Time taken to process (ms)
}

export interface TranscriptionJob {
  meetingId: string;
  audioPath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: TranscriptionResult;
  error?: string;
  retryCount: number;
  createdAt: Date;
  completedAt?: Date;
}

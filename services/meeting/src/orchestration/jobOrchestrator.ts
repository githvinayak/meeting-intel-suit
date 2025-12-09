import { Meeting } from '../models/Meeting';
import { extractionQueue } from '../queue/extractionQueue';
import { followUpDetectionQueue } from '../queue/folloUpDetecttionQueue';
import { sentimentQueue } from '../queue/sentimentQueue';
import { transcriptionQueue } from '../queue/transcriptionQueue';

/**
 * Job Orchestrator
 * Coordinates the AI processing pipeline across independent queues
 *
 * Pipeline Flow:
 * Upload → Transcription → Extraction → Sentiment → Timeline
 *
 * Each queue is independent. Orchestrator chains them together.
 */
export class JobOrchestrator {
  /**
   * Start the full AI processing pipeline for a meeting
   * Called when file is uploaded
   */
  static async startPipeline(
    meetingId: string,
    fileUrl: string, // ← Cloudinary URL
    fileSize: number, // ← File size in bytes
    userId: string
  ): Promise<void> {
    console.log(`\n🎬 Starting AI pipeline for meeting: ${meetingId}`);
    console.log(`📁 File URL: ${fileUrl}`);

    try {
      // Queue transcription job with fileUrl
      const transcriptionJob = await transcriptionQueue.addJob({
        meetingId,
        fileUrl, // ← Cloudinary URL
        fileSize, // ← File size
        userId,
        createdAt: new Date(),
      });

      console.log(`✅ Pipeline Step 1/4: Transcription queued (Job: ${transcriptionJob.id})`);
      console.log(`📊 Remaining steps will be triggered automatically after transcription\n`);
    } catch (error: any) {
      console.error(`❌ Failed to start pipeline for meeting ${meetingId}:`, error.message);

      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'failed',
        'processing.error': `Pipeline start failed: ${error.message}`,
      });

      throw error;
    }
  }

  /**
   * Called by TranscriptionWorker when transcription completes
   * Triggers next steps in the pipeline (Day 12+)
   */
  static async onTranscriptionComplete(
    meetingId: string,
    transcriptData: {
      fullText: string;
      segments: any[];
      duration: number;
      language: string;
    },
    userId?: string // ← ADD userId parameter
  ): Promise<void> {
    console.log(`\n✅ Transcription complete for meeting: ${meetingId}`);
    console.log(`📋 Triggering extraction and sentiment analysis...`);

    try {
      // Get meeting to extract participant names
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error(`Meeting ${meetingId} not found`);
      }

      // Extract participant names for sentiment analysis
      const participantNames = meeting.participants.map((p) => p.name);

      // ✅ DAY 12: Queue extraction and sentiment jobs in parallel
      const [extractionJob, sentimentJob] = await Promise.all([
        extractionQueue.addJob({
          meetingId,
          transcript: transcriptData.fullText,
          userId,
        }),
        sentimentQueue.addJob({
          meetingId,
          transcript: transcriptData.fullText,
          participants: participantNames,
          userId,
        }),
        followUpDetectionQueue.addJob({
          meetingId,
          transcript: transcriptData.fullText,
          userId,
        }),
      ]);

      console.log(`✅ Pipeline Step 2/4: Extraction queued (Job: ${extractionJob})`);
      console.log(`✅ Pipeline Step 3/4: Sentiment queued (Job: ${sentimentJob})`);

      // TODO (Day 13): Uncomment when timeline queue is ready
      /*
    const timelineJob = await timelineQueue.addJob({
      meetingId,
      transcript: transcriptData.fullText,
      duration: transcriptData.duration,
    });
    console.log(`✅ Pipeline Step 4/4: Timeline queued (Job: ${timelineJob.id})`);
    */

      console.log(`🎉 Extraction and sentiment analysis in progress!\n`);
    } catch (error: any) {
      console.error(`❌ Failed to trigger next pipeline steps for ${meetingId}:`, error.message);

      // Don't fail the whole meeting - transcription is already done
      // Just log the error and mark as failed
      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'failed',
        'processing.error': `Post-transcription pipeline failed: ${error.message}`,
      });
    }
  }
  /**
   * Get overall pipeline status for a meeting
   * Used by status endpoint
   */
  static async getPipelineStatus(meetingId: string): Promise<any> {
    try {
      // Get job statuses from all queues for THIS specific meeting
      const [transcriptionStatus, extractionStatus, sentimentStatus, followUpDetectionStatus] =
        await Promise.all([
          transcriptionQueue.getJobStatus(`transcription-${meetingId}`),
          extractionQueue.getJobStatus(`extraction-${meetingId}`),
          sentimentQueue.getJobStatus(`sentiment-${meetingId}`),
          followUpDetectionQueue.getJobStatus(`follow-up-${meetingId}`),
        ]);

      // TODO (Day 13): Add timeline status
      // const timelineStatus = await timelineQueue.getJobStatus(`timeline-${meetingId}`);

      return {
        transcription: transcriptionStatus || { state: 'unknown', progress: 0 },
        extraction: extractionStatus || { state: 'pending', progress: 0 },
        sentiment: sentimentStatus || { state: 'pending', progress: 0 },
        followUpDetection: followUpDetectionStatus || { state: 'pending', progress: 0 },
        // timeline: timelineStatus || { state: 'pending', progress: 0 },
      };
    } catch (error: any) {
      console.error(`❌ Failed to get pipeline status for ${meetingId}:`, error.message);
      return {
        transcription: { state: 'unknown', progress: 0 },
        extraction: { state: 'unknown', progress: 0 },
        sentiment: { state: 'unknown', progress: 0 },
        followUpDetection: { state: 'unknown', progress: 0 },
        error: error.message,
      };
    }
  }

  static async getQueueStats(): Promise<any> {
    try {
      const [transcriptionStats, extractionStats, sentimentStats, followUpDetectionStats] =
        await Promise.all([
          transcriptionQueue.getStats(),
          extractionQueue.getStats(),
          sentimentQueue.getStats(),
          followUpDetectionQueue.getStats(),
        ]);

      return {
        transcription: transcriptionStats,
        extraction: extractionStats,
        sentiment: sentimentStats,
        followUpDetection: followUpDetectionStats,
        totalJobs:
          transcriptionStats.total +
          extractionStats.total +
          sentimentStats.total +
          followUpDetectionStats.total,
      };
    } catch (error: any) {
      console.error('Failed to get queue stats:', error.message);
      throw error;
    }
  }
  /**
   * Cancel all pipeline jobs for a meeting
   * Useful if user cancels processing
   */
  static async cancelPipeline(meetingId: string): Promise<void> {
    console.log(`🛑 Cancelling pipeline for meeting: ${meetingId}`);

    try {
      // Cancel all jobs
      const transcriptionJob = await transcriptionQueue
        .getQueue()
        .getJob(`transcription-${meetingId}`);
      if (transcriptionJob) {
        await transcriptionJob.remove();
        console.log(`✅ Transcription job cancelled`);
      }

      // ✅ DAY 12: Cancel extraction and sentiment jobs
      const extractionJob = await extractionQueue.getQueue().getJob(`extraction-${meetingId}`);
      if (extractionJob) {
        await extractionJob.remove();
        console.log(`✅ Extraction job cancelled`);
      }

      const sentimentJob = await sentimentQueue.getQueue().getJob(`sentiment-${meetingId}`);
      if (sentimentJob) {
        await sentimentJob.remove();
        console.log(`✅ Sentiment job cancelled`);
      }

      const followUpJob = await followUpDetectionQueue.getQueue().getJob(`follow-up-${meetingId}`);
      if (followUpJob) {
        await followUpJob.remove();
        console.log(`✅ Follow-up detection job cancelled`);
      }
      // Update meeting status
      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'cancelled',
        'processing.completedAt': new Date(),
        'processing.error': 'Pipeline cancelled by user',
      });

      console.log(`✅ Pipeline cancelled for meeting: ${meetingId}`);
    } catch (error: any) {
      console.error(`❌ Failed to cancel pipeline for ${meetingId}:`, error.message);
      throw error;
    }
  }
}

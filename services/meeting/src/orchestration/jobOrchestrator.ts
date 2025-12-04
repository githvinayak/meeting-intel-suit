import { Meeting } from '../models/Meeting';
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
    }
  ): Promise<void> {
    console.log(`\n✅ Transcription complete for meeting: ${meetingId}`);
    console.log(`📋 Triggering next pipeline steps...`);

    try {
      // TODO (Day 12): Uncomment when extraction queue is ready
      /*
      const extractionJob = await extractionQueue.addJob({
        meetingId,
        transcript: transcriptData.fullText,
        segments: transcriptData.segments,
      });
      console.log(`✅ Pipeline Step 2/4: Extraction queued (Job: ${extractionJob.id})`);
      */

      // TODO (Day 12): Uncomment when sentiment queue is ready
      /*
      const sentimentJob = await sentimentQueue.addJob({
        meetingId,
        transcript: transcriptData.fullText,
        segments: transcriptData.segments,
      });
      console.log(`✅ Pipeline Step 3/4: Sentiment queued (Job: ${sentimentJob.id})`);
      */

      // TODO (Day 13): Uncomment when timeline queue is ready
      /*
      const timelineJob = await timelineQueue.addJob({
        meetingId,
        transcript: transcriptData.fullText,
        duration: transcriptData.duration,
      });
      console.log(`✅ Pipeline Step 4/4: Timeline queued (Job: ${timelineJob.id})`);
      */

      // For now (Day 10-11), just log
      console.log(`📋 Day 12+: Will trigger extraction, sentiment, and timeline jobs here`);
      console.log(`🎉 For now, transcription pipeline is complete!\n`);
    } catch (error: any) {
      console.error(`❌ Failed to trigger next pipeline steps for ${meetingId}:`, error.message);

      // Don't fail the whole meeting - transcription is already done
      // Just log the error
      await Meeting.findByIdAndUpdate(meetingId, {
        'processing.error': `Pipeline continuation failed: ${error.message}`,
      });
    }
  }

  /**
   * Get overall pipeline status for a meeting
   * Used by status endpoint
   */
  static async getPipelineStatus(meetingId: string): Promise<any> {
    try {
      // Get transcription job status
      const transcriptionStatus = await transcriptionQueue.getJobStatus(
        `transcription-${meetingId}`
      );

      // TODO (Day 12+): Add other queue statuses
      // const extractionStatus = await extractionQueue.getJobStatus(`extraction-${meetingId}`);
      // const sentimentStatus = await sentimentQueue.getJobStatus(`sentiment-${meetingId}`);
      // const timelineStatus = await timelineQueue.getJobStatus(`timeline-${meetingId}`);

      return {
        transcription: transcriptionStatus || { state: 'unknown', progress: 0 },
        // extraction: extractionStatus || { state: 'pending', progress: 0 },
        // sentiment: sentimentStatus || { state: 'pending', progress: 0 },
        // timeline: timelineStatus || { state: 'pending', progress: 0 },
      };
    } catch (error: any) {
      console.error(`❌ Failed to get pipeline status for ${meetingId}:`, error.message);
      return {
        transcription: { state: 'unknown', progress: 0 },
        error: error.message,
      };
    }
  }

  /**
   * Cancel all pipeline jobs for a meeting
   * Useful if user cancels processing
   */
  static async cancelPipeline(meetingId: string): Promise<void> {
    console.log(`🛑 Cancelling pipeline for meeting: ${meetingId}`);

    try {
      // Cancel transcription job
      const transcriptionJob = await transcriptionQueue
        .getQueue()
        .getJob(`transcription-${meetingId}`);
      if (transcriptionJob) {
        await transcriptionJob.remove();
        console.log(`✅ Transcription job cancelled`);
      }

      // TODO (Day 12+): Cancel other jobs
      // const extractionJob = await extractionQueue.getQueue().getJob(`extraction-${meetingId}`);
      // if (extractionJob) await extractionJob.remove();

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

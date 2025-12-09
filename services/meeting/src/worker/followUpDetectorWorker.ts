import { Job } from 'bull';
import { Meeting } from '../models/Meeting';
import { CommitmentService } from '../services/commitmentService';

export interface FollowUpDetectionJobData {
  meetingId: string;
  transcript: string;
  userId: string;
}

const commitmentService = new CommitmentService();

class FollowUpDetectorWorker {
  /**
   * Process follow-up detection job
   */
  static async processJob(job: Job<FollowUpDetectionJobData>): Promise<void> {
    const { meetingId, transcript, userId } = job.data;

    console.log(`\n🔍 Processing follow-up detection job ${job.id} for meeting ${meetingId}`);

    try {
      // Step 1: Validate meeting exists
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error(`Meeting ${meetingId} not found`);
      }

      console.log(`✅ Meeting found: "${meeting.title}"`);

      // Step 2: Detect commitment follow-ups using GPT-4
      console.log('🤖 Analyzing transcript for commitment mentions...');
      const detectionResult = await commitmentService.detectCommitmentFollowUps(
        meetingId,
        transcript,
        userId
      );

      if (detectionResult.detections.length === 0) {
        console.log('✅ No commitment follow-ups detected in this meeting');
        return;
      }

      // Step 3: Process detections and update commitments
      console.log(`📝 Found ${detectionResult.detections.length} commitment mentions`);
      await commitmentService.processFollowUpDetections(meetingId, detectionResult.detections);

      // Step 4: Update meeting processing metadata with cost
      if (meeting.processing) {
        meeting.processing.cost = (meeting.processing.cost || 0) + detectionResult.cost;
        await meeting.save();
      }

      console.log(`✅ Follow-up detection complete for meeting ${meetingId}`);
      console.log(`   Commitments updated: ${detectionResult.detections.length}`);
      console.log(`   Cost: $${detectionResult.cost.toFixed(4)}`);

      // Step 5: Log detection summary
      this.logDetectionSummary(meetingId, detectionResult.detections);
    } catch (error: any) {
      console.error(`❌ Follow-up detection failed for meeting ${meetingId}:`, error.message);

      // Don't fail the whole meeting - follow-up detection is optional
      // Just log the error
      try {
        await Meeting.findByIdAndUpdate(meetingId, {
          'processing.error': `Follow-up detection failed: ${error.message}`,
        });
      } catch (dbError) {
        console.error('Failed to update meeting with error:', dbError);
      }

      // Don't re-throw - we don't want to retry this job
      console.log('⚠️ Skipping follow-up detection for this meeting');
    }
  }

  /**
   * Log detection summary for monitoring
   */
  private static logDetectionSummary(meetingId: string, detections: any[]): void {
    console.log('\n🔍 FOLLOW-UP DETECTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Meeting ID: ${meetingId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`\n📋 Detected Follow-ups (${detections.length}):`);

    detections.forEach((detection, index) => {
      console.log(`\n  ${index + 1}. Commitment: ${detection.commitmentId}`);
      console.log(`     Status: ${detection.status.toUpperCase()}`);
      console.log(`     Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
      if (detection.notes) {
        console.log(`     Notes: ${detection.notes}`);
      }
    });

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

export default FollowUpDetectorWorker;

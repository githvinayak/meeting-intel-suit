import { Job } from 'bull';
import { TranscriptionResult } from '../types/transcription';
import { Meeting } from '../models/Meeting';
import { JobOrchestrator } from '../orchestration/jobOrchestrator'; // ← ADD THIS
import { TranscriptionJobData } from '../types/jobs';
import { AudioProcessor } from '../processor/audioProcessor';
import { TranscriptionService } from '../services/transcriptionService';

export class TranscriptionWorker {
  static async processJob(job: Job<TranscriptionJobData>): Promise<TranscriptionResult> {
    const { meetingId, fileUrl, userId } = job.data;

    console.log(`\n🎬 Processing transcription job for meeting: ${meetingId}`);
    console.log(`📁 Audio file: ${fileUrl}`);

    try {
      // Update job progress - 10%
      await job.progress(10);

      // Step 1: Validate audio file
      console.log('🔍 Step 1/4: Validating audio file...');
      await AudioProcessor.validate(fileUrl);
      await job.progress(25);

      // Step 2: Get audio metadata
      console.log('📊 Step 2/4: Reading audio metadata...');
      const metadata = await AudioProcessor.getMetadata(fileUrl);
      console.log(`   Duration: ${metadata.duration.toFixed(0)}s`);
      console.log(`   Size: ${metadata.sizeMB.toFixed(2)}MB`);
      console.log(`   Format: ${metadata.format}`);

      const estimatedCost = AudioProcessor.calculateEstimatedCost(metadata.duration);
      console.log(`   Estimated cost: $${estimatedCost.toFixed(4)}`);

      await job.progress(40);

      // Step 3: Update meeting status to processing
      console.log('💾 Step 3/4: Updating meeting status...');
      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'processing',
        'processing.startedAt': new Date(),
      });
      await job.progress(50);

      // Step 4: Transcribe audio
      console.log('🤖 Step 4/4: Transcribing audio...');
      const result = await TranscriptionService.transcribe(fileUrl, meetingId);
      await job.progress(90);

      // Step 5: Save transcription to database
      console.log('💾 Saving transcription to database...');
      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'transcribed',
        transcript: {
          segments: result.segments,
          fullText: result.fullText,
          language: result.language,
          duration: result.duration,
        },
        'processing.completedAt': new Date(),
        'processing.cost': result.cost,
        'processing.model': result.model,
      });

      await job.progress(100);

      console.log(`✅ Transcription completed for meeting: ${meetingId}`);
      console.log(`   Segments: ${result.segments.length}`);
      console.log(`   Text length: ${result.fullText.length} characters`);
      console.log(`   Cost: $${result.cost.toFixed(4)}`);
      console.log(`   Processing time: ${result.processingTime}ms\n`);

      // ← ADD THIS: Trigger next steps in pipeline via orchestrator
      console.log(`🔗 Triggering next pipeline steps via orchestrator...`);
      await JobOrchestrator.onTranscriptionComplete(
        meetingId,
        {
          fullText: result.fullText,
          segments: result.segments,
          duration: result.duration,
          language: result.language,
        },
        userId
      );
      return result;
    } catch (error: any) {
      console.error(`❌ Transcription failed for meeting ${meetingId}:`, error.message);

      // Update meeting status to failed
      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'failed',
        'processing.error': error.message,
        'processing.completedAt': new Date(),
      });

      throw error; // Re-throw for Bull's retry mechanism
    }
  }

  /**
   * Handle job completion
   */
  static async onCompleted(
    job: Job<TranscriptionJobData>,
    result: TranscriptionResult
  ): Promise<void> {
    console.log(`✅ Job ${job.id} completed for meeting ${job.data.meetingId}`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Cost: $${result.cost.toFixed(4)}`);

    // Optional: Clean up audio file after successful transcription
    // Uncomment if you want to delete audio after processing
    /*
    if (fs.existsSync(job.data.fileUrl)) {
      fs.unlinkSync(job.data.fileUrl);
      console.log(`🗑️  Deleted audio file: ${job.data.fileUrl}`);
    }
    */
  }

  /**
   * Handle job failure
   */
  static async onFailed(job: Job<TranscriptionJobData>, error: Error): Promise<void> {
    console.error(`❌ Job ${job.id} failed for meeting ${job.data.meetingId}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Attempt: ${job.attemptsMade}/${job.opts.attempts}`);

    // If all retries exhausted, mark as permanently failed
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      console.error(`💀 All retries exhausted for meeting ${job.data.meetingId}`);

      await Meeting.findByIdAndUpdate(job.data.meetingId, {
        status: 'failed',
        'processing.error': `Failed after ${job.attemptsMade} attempts: ${error.message}`,
        'processing.completedAt': new Date(),
      });
    }
  }

  /**
   * Handle job progress updates
   */
  static onProgress(job: Job<TranscriptionJobData>, progress: number): void {
    console.log(`📊 Job ${job.id} progress: ${progress}%`);
  }

  /**
   * Handle stalled jobs
   */
  static async onStalled(job: Job<TranscriptionJobData>): Promise<void> {
    console.warn(`⚠️  Job ${job.id} stalled for meeting ${job.data.meetingId}`);

    // Update meeting status
    await Meeting.findByIdAndUpdate(job.data.meetingId, {
      status: 'pending',
      'processing.error': 'Job stalled and will be retried',
    });
  }
}

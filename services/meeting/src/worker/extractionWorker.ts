import { Job } from 'bull';
import { extractFromTranscript } from '../services/extractionService';
import { Meeting } from '../models/Meeting';
import { v4 as uuidv4 } from 'uuid';
import { ExtractionJobData } from '../queue/extractionQueue';

class ExtractionWorker {
  /**
   * Process a single extraction job
   */
  static async processJob(job: Job<ExtractionJobData>): Promise<void> {
    const { meetingId, transcript, userId } = job.data;

    console.log(`\n🔍 Processing extraction job ${job.id} for meeting ${meetingId}`);

    try {
      // Step 1: Validate meeting exists
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error(`Meeting ${meetingId} not found`);
      }

      console.log(`✅ Meeting found: "${meeting.title}"`);

      // Step 2: Update status to processing
      meeting.status = 'processing';
      await meeting.save();

      // Step 3: Call extraction service (GPT-4)
      console.log('🤖 Calling GPT-4 for extraction...');
      const extractionResult = await extractFromTranscript(transcript);

      // Step 4: Transform action items (add IDs and timestamps)
      const actionItems = extractionResult.actionItems.map((item) => ({
        id: uuidv4(),
        description: item.description,
        assignedTo: item.assignedTo,
        priority: item.priority,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        status: 'pending' as const,
        extractedAt: new Date(),
      }));

      // Step 5: Transform decisions (add IDs and timestamps)
      const decisions = extractionResult.decisions.map((item) => ({
        id: uuidv4(),
        description: item.description,
        madeBy: item.madeBy,
        impact: item.impact,
        context: item.context,
        timestamp: new Date(),
        extractedAt: new Date(),
      }));

      // Step 6: Save to database
      meeting.actionItems = actionItems;
      meeting.decisions = decisions;

      // Update processing metadata
      if (!meeting.processing) {
        meeting.processing = {};
      }
      meeting.processing.cost = (meeting.processing.cost || 0) + extractionResult.cost;

      await meeting.save();

      console.log(`✅ Extraction complete for meeting ${meetingId}`);
      console.log(`   Action Items: ${actionItems.length}`);
      console.log(`   Decisions: ${decisions.length}`);
      console.log(`   Cost: $${extractionResult.cost.toFixed(4)}`);

      // Step 7: Log extraction details
      this.logExtractionResults(meetingId, actionItems, decisions, extractionResult.cost);
    } catch (error: any) {
      console.error(`❌ Extraction failed for meeting ${meetingId}:`, error.message);

      // Save error to meeting
      try {
        await Meeting.findByIdAndUpdate(meetingId, {
          status: 'failed',
          'processing.error': `Extraction failed: ${error.message}`,
        });
      } catch (dbError) {
        console.error('Failed to update meeting with error:', dbError);
      }

      throw error; // Re-throw for Bull retry mechanism
    }
  }

  /**
   * Log extraction results for monitoring
   */
  private static logExtractionResults(
    meetingId: string,
    actionItems: any[],
    decisions: any[],
    cost: number
  ): void {
    console.log('\n📊 EXTRACTION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Meeting ID: ${meetingId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`\n📋 Action Items (${actionItems.length}):`);

    actionItems.forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.priority.toUpperCase()}] ${item.description}`);
      if (item.assignedTo) {
        console.log(`     → Assigned to: ${item.assignedTo}`);
      }
      if (item.dueDate) {
        console.log(`     → Due: ${item.dueDate.toISOString().split('T')[0]}`);
      }
    });

    console.log(`\n🎯 Key Decisions (${decisions.length}):`);
    decisions.forEach((decision, index) => {
      console.log(`  ${index + 1}. [${decision.impact.toUpperCase()}] ${decision.description}`);
      if (decision.madeBy) {
        console.log(`     → Made by: ${decision.madeBy}`);
      }
      if (decision.context) {
        console.log(`     → Context: ${decision.context}`);
      }
    });

    console.log(`\n💰 Total Cost: $${cost.toFixed(4)}`);
    console.log('='.repeat(50) + '\n');
  }
}

export default ExtractionWorker;

import { Job } from 'bull';
import { analyzeSentiment, getBurnoutRiskLevel } from '../services/sentimentService';
import { Meeting } from '../models/Meeting';
import { SentimentJobData, sentimentQueue } from '../queue/sentimentQueue';

class SentimentWorker {
  /**
   * Start processing sentiment jobs
   */
  static start(): void {
    const queue = sentimentQueue.getQueue();

    queue.process(async (job: Job<SentimentJobData>) => {
      return await this.processJob(job);
    });

    console.log('🎭 Sentiment worker started');
  }

  /**
   * Process a single sentiment analysis job
   */
  static async processJob(job: Job<SentimentJobData>): Promise<void> {
    const { meetingId, transcript, participants, userId } = job.data;

    console.log(`\n🎭 Processing sentiment job ${job.id} for meeting ${meetingId}`);

    try {
      // Step 1: Validate meeting exists
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error(`Meeting ${meetingId} not found`);
      }

      console.log(`✅ Meeting found: "${meeting.title}"`);

      // Step 2: Call sentiment service (GPT-4)
      console.log('🤖 Calling GPT-4 for sentiment analysis...');
      const sentimentResult = await analyzeSentiment(transcript, participants);

      // Step 3: Save sentiment analysis to database
      meeting.sentiment = {
        overall: sentimentResult.overall,
        score: sentimentResult.score,
        emotions: sentimentResult.emotions,
        burnoutIndicators: sentimentResult.burnoutIndicators,
        analyzedAt: new Date(),
      };

      // Step 4: Update participants with sentiment data
      // Match GPT-4 participant analysis with existing participants
      if (sentimentResult.participants.length > 0) {
        meeting.participants = meeting.participants.map((participant) => {
          // Find matching sentiment data by name (case-insensitive)
          const sentimentData = sentimentResult.participants.find(
            (p) => p.name.toLowerCase() === participant.name.toLowerCase()
          );

          if (sentimentData) {
            return {
              userId: participant.userId,
              name: participant.name,
              email: participant.email,
              role: participant.role,
              sentimentScore: sentimentData.sentimentScore,
              engagementLevel: sentimentData.engagementLevel,
              speakingTime: participant.speakingTime,
              concerns: sentimentData.concerns,
            };
          }

          // Return participant as-is if no sentiment data found
          return {
            userId: participant.userId,
            name: participant.name,
            email: participant.email,
            role: participant.role,
            sentimentScore: participant.sentimentScore,
            engagementLevel: participant.engagementLevel,
            speakingTime: participant.speakingTime,
            concerns: participant.concerns,
          };
        });
      }

      // Step 5: Update processing metadata
      if (!meeting.processing) {
        meeting.processing = {};
      }
      meeting.processing.cost = (meeting.processing.cost || 0) + sentimentResult.cost;
      meeting.processing.completedAt = new Date();

      // Step 6: Update meeting status to completed
      meeting.status = 'completed';

      await meeting.save();

      console.log(`✅ Sentiment analysis complete for meeting ${meetingId}`);
      console.log(`   Overall: ${sentimentResult.overall} (${sentimentResult.score.toFixed(2)})`);
      console.log(`   Burnout Score: ${sentimentResult.burnoutIndicators.score}/100`);
      console.log(`   Participants Analyzed: ${sentimentResult.participants.length}`);
      console.log(`   Cost: $${sentimentResult.cost.toFixed(4)}`);

      // Step 7: Log detailed sentiment results
      this.logSentimentResults(meetingId, sentimentResult);
    } catch (error: any) {
      console.error(`❌ Sentiment analysis failed for meeting ${meetingId}:`, error.message);

      // Save error to meeting
      try {
        await Meeting.findByIdAndUpdate(meetingId, {
          status: 'failed',
          'processing.error': `Sentiment analysis failed: ${error.message}`,
        });
      } catch (dbError) {
        console.error('Failed to update meeting with error:', dbError);
      }

      throw error; // Re-throw for Bull retry mechanism
    }
  }

  /**
   * Log sentiment results for monitoring
   */
  private static logSentimentResults(meetingId: string, result: any): void {
    console.log('\n🎭 SENTIMENT ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Meeting ID: ${meetingId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    console.log(
      `\n📊 Overall Sentiment: ${result.overall.toUpperCase()} (${result.score.toFixed(2)})`
    );

    console.log(`\n🎨 Emotions:`);
    console.log(`  😊 Joy:         ${(result.emotions.joy * 100).toFixed(1)}%`);
    console.log(`  😤 Frustration: ${(result.emotions.frustration * 100).toFixed(1)}%`);
    console.log(`  😰 Stress:      ${(result.emotions.stress * 100).toFixed(1)}%`);
    console.log(`  🔥 Engagement:  ${(result.emotions.engagement * 100).toFixed(1)}%`);

    console.log(`\n🔥 Burnout Assessment:`);
    console.log(`  Score: ${result.burnoutIndicators.score}/100`);
    console.log(`  Risk Level: ${getBurnoutRiskLevel(result.burnoutIndicators.score)}`);

    if (result.burnoutIndicators.factors.length > 0) {
      console.log(`\n  ⚠️  Concerning Factors:`);
      result.burnoutIndicators.factors.forEach((factor: string, index: number) => {
        console.log(`    ${index + 1}. ${factor}`);
      });
    }

    if (result.burnoutIndicators.recommendations.length > 0) {
      console.log(`\n  💡 Recommendations:`);
      result.burnoutIndicators.recommendations.forEach((rec: string, index: number) => {
        console.log(`    ${index + 1}. ${rec}`);
      });
    }

    if (result.participants.length > 0) {
      console.log(`\n👥 Participant Analysis (${result.participants.length}):`);
      result.participants.forEach((p: any, index: number) => {
        console.log(`\n  ${index + 1}. ${p.name}`);
        console.log(
          `     Sentiment: ${p.sentimentScore.toFixed(2)} | Engagement: ${(p.engagementLevel * 100).toFixed(1)}%`
        );
        if (p.concerns.length > 0) {
          console.log(`     ⚠️  Concerns: ${p.concerns.join(', ')}`);
        }
      });
    }

    console.log(`\n💰 Analysis Cost: $${result.cost.toFixed(4)}`);
    console.log('='.repeat(60) + '\n');
  }
}

export default SentimentWorker;

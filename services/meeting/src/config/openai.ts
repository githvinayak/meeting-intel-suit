import OpenAI from 'openai';
import { TranscriptionResult } from '../types/transcription';
import { CostCalculator } from '../utils/costCalculator';
import { MockTranscription } from '../utils/mockTranscription';
import fs from 'fs';
import { config } from './config';

export class WhisperClient {
  private client: OpenAI;
  private useMock: boolean;
  private model: string;

  constructor() {
    // Check if we should use mock mode
    this.useMock = config.openai.useMock;
    this.model = config.openai.model || 'whisper-1';

    // Initialize OpenAI client (even in mock mode, for easy switching)
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    // Log mode on startup
    if (this.useMock) {
      console.log('🎭 Whisper Client: MOCK MODE (Free - No API calls)');
    } else {
      console.log('🤖 Whisper Client: REAL MODE (Using OpenAI API)');
      this.checkCostWarnings();
    }
  }

  /**
   * Transcribe audio file
   */
  async transcribe(audioPath: string, meetingId: string): Promise<TranscriptionResult> {
    const startTime = Date.now();

    // MOCK MODE - Free, instant transcription
    if (this.useMock) {
      console.log(`🎭 [MOCK] Transcribing ${audioPath} (FREE)`);
      await this.simulateDelay(2000); // Simulate API delay
      return MockTranscription.generate(300); // 5 min mock audio
    }

    // REAL MODE - Actual OpenAI API call
    console.log(`🤖 [REAL] Transcribing ${audioPath} with OpenAI Whisper`);

    try {
      // Check file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Get file stats for cost calculation
      const stats = fs.statSync(audioPath);
      const fileSizeMB = stats.size / (1024 * 1024);

      console.log(`📁 File size: ${fileSizeMB.toFixed(2)}MB`);

      // Validate file size
      const maxSizeMB = config.audio.maxSizeMB;
      if (fileSizeMB > maxSizeMB) {
        throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`);
      }

      // Call OpenAI Whisper API
      const response = await this.client.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: this.model,
        response_format: 'verbose_json', // Get timestamps
        timestamp_granularities: ['segment'], // Get segment-level timestamps
      });

      const processingTime = Date.now() - startTime;

      // Parse response into our format
      const result = this.parseWhisperResponse(response, processingTime);

      // Log cost
      await CostCalculator.logCost(meetingId, result.duration, this.model);

      console.log(`✅ Transcription completed in ${processingTime}ms`);
      console.log(`💰 Cost: $${result.cost.toFixed(4)}`);

      return result;
    } catch (error: any) {
      console.error('❌ Whisper API error:', error);

      // Handle specific OpenAI errors
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (error.status === 401) {
        throw new Error('Invalid API key. Check OPENAI_API_KEY in .env');
      }

      if (error.status === 413) {
        throw new Error('File too large. Maximum size is 25MB.');
      }

      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Parse OpenAI Whisper response into our format
   */
  private parseWhisperResponse(response: any, processingTime: number): TranscriptionResult {
    const segments = (response.segments || []).map((segment: any) => ({
      text: segment.text.trim(),
      timestamp: segment.start,
      confidence: segment.no_speech_prob ? 1 - segment.no_speech_prob : 0.95,
      speaker: undefined, // Whisper doesn't provide speaker diarization
      sentiment: undefined, // We'll add this later with GPT-4
    }));

    const duration = response.duration || 0;
    const cost = CostCalculator.calculateCost(duration);

    return {
      segments,
      fullText: response.text,
      duration,
      language: response.language || 'en',
      cost,
      model: this.model,
      processingTime,
    };
  }

  /**
   * Check if we're approaching cost limits
   */
  private checkCostWarnings(): void {
    if (CostCalculator.shouldWarnAboutCosts()) {
      console.warn('⚠️  WARNING: Less than $1 in free credits remaining!');
      console.warn('💡 Consider switching to MOCK mode: USE_MOCK_TRANSCRIPTION=true');
    }

    const todayCost = CostCalculator.getTodaysCost();
    const warnThreshold = config.limits.warnThreshold;

    if (todayCost > warnThreshold) {
      console.warn(
        `⚠️  WARNING: Today's cost ($${todayCost.toFixed(2)}) exceeded threshold ($${warnThreshold})`
      );
    }
  }

  /**
   * Simulate API delay in mock mode
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get cost summary
   */
  getCostSummary() {
    return CostCalculator.getCostSummary();
  }

  /**
   * Check if mock mode is enabled
   */
  isMockMode(): boolean {
    return this.useMock;
  }
}

// Export singleton instance
export const whisperClient = new WhisperClient();

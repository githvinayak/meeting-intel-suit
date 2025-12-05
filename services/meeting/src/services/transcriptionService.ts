import { openai, WHISPER_CONFIG, USE_MOCK_MODE } from '../config/openai';
import { CostCalculator } from '../utils/costCalculator';
import { MockTranscription } from '../utils/mockTranscription';
import { TranscriptionResult } from '../types/transcription';
import fs from 'fs';
import { AudioProcessor } from '../processor/audioProcessor';

/**
 * Transcription Service
 * Business logic for audio transcription using OpenAI Whisper
 */
export class TranscriptionService {
  static async transcribe(audioPath: string, meetingId: string): Promise<TranscriptionResult> {
    const startTime = Date.now();

    console.log(`🎤 TranscriptionService: Starting transcription`);
    console.log(`   Meeting ID: ${meetingId}`);
    console.log(`   Audio Path: ${audioPath}`);
    console.log(`   Mode: ${USE_MOCK_MODE ? 'MOCK (Free)' : 'REAL (OpenAI API)'}`);

    // Step 1: Validate audio file
    console.log(`   🔍 Validating audio file...`);
    await AudioProcessor.validate(audioPath);

    // Step 2: Get metadata
    console.log(`   📊 Reading audio metadata...`);
    const metadata = await AudioProcessor.getMetadata(audioPath);
    console.log(`   ℹ️  Duration: ${metadata.duration.toFixed(0)}s`);
    console.log(`   ℹ️  Size: ${metadata.sizeMB.toFixed(2)}MB`);
    console.log(`   ℹ️  Format: ${metadata.format}`);

    // Step 3: Calculate estimated cost
    const estimatedCost = AudioProcessor.calculateEstimatedCost(metadata.duration);
    console.log(`   💰 Estimated cost: $${estimatedCost.toFixed(4)}`);

    // Step 4: Transcribe (Mock or Real)
    let result: TranscriptionResult;

    if (USE_MOCK_MODE) {
      // Mock transcription (FREE)
      console.log(`   🎭 Generating mock transcription...`);
      await this.simulateDelay(2000); // Simulate API delay
      result = MockTranscription.generate(Math.floor(metadata.duration));
      result.processingTime = Date.now() - startTime;
    } else {
      // Real Whisper API call
      console.log(`   🤖 Calling OpenAI Whisper API...`);

      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      const response = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: WHISPER_CONFIG.model,
        language: WHISPER_CONFIG.language,
        response_format: WHISPER_CONFIG.response_format,
        temperature: WHISPER_CONFIG.temperature,
      });

      // Parse Whisper response
      result = this.parseWhisperResponse(response, Date.now() - startTime, meetingId);

      // Log cost
      await CostCalculator.logCost(meetingId, result.duration, WHISPER_CONFIG.model);
    }

    console.log(`   ✅ Transcription complete`);
    console.log(`   📊 Segments: ${result.segments.length}`);
    console.log(`   📝 Words: ${result.fullText.split(' ').length}`);
    console.log(`   💰 Cost: $${result.cost.toFixed(4)}`);
    console.log(`   ⏱️  Processing time: ${result.processingTime}ms`);

    return result;
  }

  /**
   * Parse Whisper API response into our format
   */
  private static parseWhisperResponse(
    response: any,
    processingTime: number,
    meetingId: string
  ): TranscriptionResult {
    const segments = (response.segments || []).map((segment: any) => ({
      text: segment.text.trim(),
      timestamp: segment.start,
      confidence: segment.no_speech_prob ? 1 - segment.no_speech_prob : 0.95,
      speaker: undefined, // Whisper doesn't provide speaker diarization
      sentiment: undefined, // Will be added in Day 12
    }));

    const duration = response.duration || 0;
    const cost = CostCalculator.calculateCost(duration);

    return {
      segments,
      fullText: response.text,
      duration,
      language: response.language || 'en',
      cost,
      model: WHISPER_CONFIG.model,
      processingTime,
    };
  }

  /**
   * Estimate transcription cost without processing
   */
  static async estimateCost(audioPath: string): Promise<number> {
    const metadata = await AudioProcessor.getMetadata(audioPath);
    return AudioProcessor.calculateEstimatedCost(metadata.duration);
  }

  /**
   * Validate audio file
   */
  static async validateAudio(audioPath: string): Promise<boolean> {
    try {
      await AudioProcessor.validate(audioPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get audio metadata
   */
  static async getAudioInfo(audioPath: string) {
    return await AudioProcessor.getMetadata(audioPath);
  }

  /**
   * Simulate API delay in mock mode
   */
  private static simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static getCostSummary() {
    return CostCalculator.getCostSummary();
  }
}

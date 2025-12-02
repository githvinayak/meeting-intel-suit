import { TranscriptionResult, TranscriptSegment } from '../types/transcription';

/**
 * Generate mock transcription for development (FREE)
 */
export class MockTranscription {
  static generate(duration: number = 300): TranscriptionResult {
    // Generate realistic mock segments
    const segments: TranscriptSegment[] = [
      {
        text: "Good morning everyone. Let's get started with today's standup meeting.",
        speaker: 'Speaker 1',
        timestamp: 0,
        confidence: 0.95,
        sentiment: 'neutral',
      },
      {
        text: 'Yesterday I completed the authentication module and deployed it to staging.',
        speaker: 'Speaker 2',
        timestamp: 5.2,
        confidence: 0.92,
        sentiment: 'positive',
      },
      {
        text: "Today I'm working on the payment integration with Stripe.",
        speaker: 'Speaker 2',
        timestamp: 11.5,
        confidence: 0.94,
        sentiment: 'neutral',
      },
      {
        text: "I'm facing some challenges with the webhook validation. Might need help.",
        speaker: 'Speaker 2',
        timestamp: 16.8,
        confidence: 0.89,
        sentiment: 'negative',
      },
      {
        text: "No blockers for now. That's it from my side.",
        speaker: 'Speaker 2',
        timestamp: 23.1,
        confidence: 0.96,
        sentiment: 'neutral',
      },
      {
        text: 'Thanks! Let me know if you need help with those webhooks.',
        speaker: 'Speaker 1',
        timestamp: 27.5,
        confidence: 0.93,
        sentiment: 'positive',
      },
    ];

    const fullText = segments.map((s) => s.text).join(' ');

    return {
      segments,
      fullText,
      duration,
      language: 'en',
      cost: 0, // Mock is FREE
      model: 'mock-whisper',
      processingTime: 150, // Simulated processing time
    };
  }

  /**
   * Generate mock with custom text (for testing edge cases)
   */
  static generateCustom(text: string, duration: number = 60): TranscriptionResult {
    const segments: TranscriptSegment[] = [
      {
        text,
        speaker: 'Speaker 1',
        timestamp: 0,
        confidence: 0.95,
        sentiment: 'neutral',
      },
    ];

    return {
      segments,
      fullText: text,
      duration,
      language: 'en',
      cost: 0,
      model: 'mock-whisper',
      processingTime: 100,
    };
  }
}

import { openai } from '../config/openai';
import { SENTIMENT_PROMPT } from '../prompts/sentiment';



// Cost tracking (GPT-4 pricing)
const GPT4_INPUT_COST = 0.03 / 1000;
const GPT4_OUTPUT_COST = 0.06 / 1000;

// Raw sentiment result (before database formatting)
export interface RawEmotionScores {
  joy: number;
  frustration: number;
  stress: number;
  engagement: number;
}

export interface RawBurnoutIndicators {
  score: number;
  factors: string[];
  recommendations: string[];
}

export interface RawParticipantSentiment {
  name: string;
  sentimentScore: number;
  engagementLevel: number;
  concerns: string[];
}

export interface SentimentServiceResult {
  overall: 'positive' | 'neutral' | 'negative';
  score: number;
  emotions: RawEmotionScores;
  burnoutIndicators: RawBurnoutIndicators;
  participants: RawParticipantSentiment[];
  cost: number;
  tokensUsed: {
    input: number;
    output: number;
  };
}

/**
 * Analyze sentiment from transcript using GPT-4
 * Pure business logic - no database operations
 */
export class SentimentService {
  async analyzeSentiment(
    transcript: string,
    participantNames: string[]
  ): Promise<SentimentServiceResult> {
    console.log('🎭 Starting sentiment analysis...');

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Transcript is empty or invalid');
    }

    try {
      // Prepare prompt with transcript and participants
      const prompt = SENTIMENT_PROMPT.replace('{transcript}', transcript).replace(
        '{participants}',
        participantNames.join(', ') || 'Unknown participants'
      );

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert organizational psychologist analyzing team dynamics and sentiment. Always return valid JSON with all required fields.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4, // Slightly higher for nuanced analysis
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content || '{}';

      // Parse response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse sentiment JSON:', content);
        throw new Error('Invalid JSON response from GPT-4');
      }

      // Validate and extract data with defaults
      const result: SentimentServiceResult = {
        overall: parsed.overall || 'neutral',
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        emotions: {
          joy: parsed.emotions?.joy ?? 0.5,
          frustration: parsed.emotions?.frustration ?? 0.5,
          stress: parsed.emotions?.stress ?? 0.5,
          engagement: parsed.emotions?.engagement ?? 0.5,
        },
        burnoutIndicators: {
          score: parsed.burnoutIndicators?.score ?? 0,
          factors: Array.isArray(parsed.burnoutIndicators?.factors)
            ? parsed.burnoutIndicators.factors
            : [],
          recommendations: Array.isArray(parsed.burnoutIndicators?.recommendations)
            ? parsed.burnoutIndicators.recommendations
            : [],
        },
        participants: Array.isArray(parsed.participants)
          ? parsed.participants.map((p: any) => ({
              name: p.name || 'Unknown',
              sentimentScore: typeof p.sentimentScore === 'number' ? p.sentimentScore : 0,
              engagementLevel: typeof p.engagementLevel === 'number' ? p.engagementLevel : 0.5,
              concerns: Array.isArray(p.concerns) ? p.concerns : [],
            }))
          : [],
        cost: 0, // Will calculate below
        tokensUsed: {
          input: completion.usage?.prompt_tokens || 0,
          output: completion.usage?.completion_tokens || 0,
        },
      };

      // Calculate cost
      result.cost =
        result.tokensUsed.input * GPT4_INPUT_COST + result.tokensUsed.output * GPT4_OUTPUT_COST;

      console.log(`✅ Sentiment analysis complete`);
      console.log(`   Overall: ${result.overall} (${result.score.toFixed(2)})`);
      console.log(`   Burnout score: ${result.burnoutIndicators.score}/100`);
      console.log(`   Participants analyzed: ${result.participants.length}`);
      console.log(`💰 Sentiment cost: $${result.cost.toFixed(4)}`);
      console.log(
        `📊 Tokens used: ${result.tokensUsed.input} input, ${result.tokensUsed.output} output`
      );

      return result;
    } catch (error: any) {
      console.error('Sentiment analysis failed:', error.message);
      throw new Error(`Sentiment analysis failed: ${error.message}`);
    }
  }

  /**
   * Helper: Validate emotion scores are in valid range (0-1)
   */
  clampScore(value: number, min: number = 0, max: number = 1): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Helper: Get risk level from burnout score
   */
  getBurnoutRiskLevel(score: number): string {
    if (score <= 30) return 'Low - Healthy pace';
    if (score <= 60) return 'Moderate - Monitor closely';
    if (score <= 80) return 'High - Intervention recommended';
    return 'Critical - Immediate action needed';
  }

  /**
   * Helper: Get sentiment emoji for display
   */
  getSentimentEmoji(sentiment: 'positive' | 'neutral' | 'negative'): string {
    const emojiMap = {
      positive: '😊',
      neutral: '😐',
      negative: '😟',
    };
    return emojiMap[sentiment];
  }
}

import OpenAI from 'openai';
import { ACTION_ITEMS_PROMPT } from '../prompts/actionItems';
import { DECISIONS_PROMPT } from '../prompts/decisions';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cost tracking (GPT-4 pricing as of 2024)
const GPT4_INPUT_COST = 0.03 / 1000; // $0.03 per 1K input tokens
const GPT4_OUTPUT_COST = 0.06 / 1000; // $0.06 per 1K output tokens

// Raw extraction result (before database formatting)
interface RawActionItem {
  description: string;
  assignedTo?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string; // ISO date string or null
}

interface RawDecision {
  description: string;
  madeBy?: string;
  impact: 'high' | 'medium' | 'low';
  context?: string;
}

export interface ExtractionServiceResult {
  actionItems: RawActionItem[];
  decisions: RawDecision[];
  cost: number;
  tokensUsed: {
    input: number;
    output: number;
  };
}

export class ExtractionService {
  /**
   * Extract action items from transcript using GPT-4
   */
  async extractActionItems(transcript: string): Promise<{
    actionItems: RawActionItem[];
    tokensUsed: { input: number; output: number };
  }> {
    try {
      const prompt = ACTION_ITEMS_PROMPT.replace('{transcript}', transcript);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert meeting assistant that extracts action items from transcripts. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content || '[]';

      // Parse response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse action items JSON:', content);
        parsed = [];
      }

      // Extract array (handle both direct array and wrapped object)
      const actionItems: RawActionItem[] = Array.isArray(parsed)
        ? parsed
        : parsed.actionItems || [];

      const tokensUsed = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
      };

      console.log(`✅ Extracted ${actionItems.length} action items`);
      return { actionItems, tokensUsed };
    } catch (error: any) {
      console.error('Action items extraction failed:', error.message);
      throw new Error(`Action items extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract key decisions from transcript using GPT-4
   */
  async extractDecisions(transcript: string): Promise<{
    decisions: RawDecision[];
    tokensUsed: { input: number; output: number };
  }> {
    try {
      const prompt = DECISIONS_PROMPT.replace('{transcript}', transcript);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert meeting assistant that extracts key decisions from transcripts. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content || '[]';

      // Parse response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse decisions JSON:', content);
        parsed = [];
      }

      // Extract array
      const decisions: RawDecision[] = Array.isArray(parsed) ? parsed : parsed.decisions || [];

      const tokensUsed = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
      };

      console.log(`✅ Extracted ${decisions.length} decisions`);
      return { decisions, tokensUsed };
    } catch (error: any) {
      console.error('Decisions extraction failed:', error.message);
      throw new Error(`Decisions extraction failed: ${error.message}`);
    }
  }

  /**
   * Main extraction service - returns raw GPT-4 results
   * No database operations - pure business logic
   */
  async extractFromTranscript(transcript: string): Promise<ExtractionServiceResult> {
    console.log('🔍 Starting GPT-4 extraction...');

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Transcript is empty or invalid');
    }

    // Run both extractions in parallel for efficiency
    const [actionItemsResult, decisionsResult] = await Promise.all([
      this.extractActionItems(transcript),
      this.extractDecisions(transcript),
    ]);

    // Calculate total cost
    const totalInputTokens = actionItemsResult.tokensUsed.input + decisionsResult.tokensUsed.input;
    const totalOutputTokens =
      actionItemsResult.tokensUsed.output + decisionsResult.tokensUsed.output;
    const cost = totalInputTokens * GPT4_INPUT_COST + totalOutputTokens * GPT4_OUTPUT_COST;

    console.log(`💰 Extraction cost: $${cost.toFixed(4)}`);
    console.log(`📊 Tokens used: ${totalInputTokens} input, ${totalOutputTokens} output`);

    return {
      actionItems: actionItemsResult.actionItems,
      decisions: decisionsResult.decisions,
      cost,
      tokensUsed: {
        input: totalInputTokens,
        output: totalOutputTokens,
      },
    };
  }
}

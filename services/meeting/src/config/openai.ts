import OpenAI from 'openai';
import { config } from './config';

/**
 * OpenAI Client Configuration
 * Pure configuration - no business logic
 */
export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Whisper API Configuration
 */
export const WHISPER_CONFIG = {
  model: config.openai.model,
  language: 'en', // Optional: auto-detect if not specified
  response_format: 'verbose_json' as const, // Returns timestamps and metadata
  temperature: 0, // Deterministic output
};

/**
 * GPT-4 Configuration (for Day 12+)
 */
export const GPT_CONFIG = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  max_tokens: 2000,
};

/**
 * Cost Constants
 */
export const COSTS = {
  WHISPER_PER_MINUTE: 0.006, // $0.006 per minute
  GPT4_INPUT_PER_1K: 0.01, // $0.01 per 1K input tokens
  GPT4_OUTPUT_PER_1K: 0.03, // $0.03 per 1K output tokens
};

/**
 * Check if mock mode is enabled
 */
export const USE_MOCK_MODE = config.openai.useMock === true;

console.log(`🤖 OpenAI Configuration:`);
console.log(`   Mock Mode: ${USE_MOCK_MODE ? 'ENABLED (Free)' : 'DISABLED (Real API)'}`);
console.log(`   Whisper Model: ${WHISPER_CONFIG.model}`);
console.log(`   GPT Model: ${GPT_CONFIG.model}`);

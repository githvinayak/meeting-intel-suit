import { processAIJob } from '../processor/aiProsessor';
import aiQueue from '../queue/aiQueue';

/**
 * AI Queue Worker
 * Processes jobs from the AI queue
 */
export const startAIWorker = () => {
  console.log('🔧 Starting AI worker...');

  // Process jobs with concurrency of 5
  aiQueue.process(5, async (job) => {
    return await processAIJob(job);
  });

  console.log('✅ AI worker started. Listening for jobs...');
};

/**
 * Graceful shutdown
 */
export const stopAIWorker = async () => {
  console.log('🛑 Stopping AI worker...');
  await aiQueue.close();
  console.log('✅ AI worker stopped');
};

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await stopAIWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await stopAIWorker();
  process.exit(0);
});

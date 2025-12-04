import { extractionQueue } from '../queue/extractionQueue';
import { sentimentQueue } from '../queue/sentimentQueue';
import { transcriptionQueue } from '../queue/transcriptionQueue';
import ExtractionWorker from './extractionWorker';
import SentimentWorker from './sentimentWorker';
import { TranscriptionWorker } from './transcriptionWorker';


/**
 * Worker Manager
 * Starts all Bull workers and handles graceful shutdown
 */
class WorkerManager {
  /**
   * Start all workers
   */
  static start(): void {
    console.log('\n🚀 Starting all workers...\n');

    try {
      // Start Day 11 worker
      TranscriptionWorker.start();
      console.log('✅ Transcription worker running');

      // Start Day 12 workers
      ExtractionWorker.start();
      console.log('✅ Extraction worker running');

      SentimentWorker.start();
      console.log('✅ Sentiment worker running');

      console.log('\n🎉 All workers started successfully!');
      console.log('📊 Workers are now processing jobs from their queues...\n');

      // Setup graceful shutdown
      this.setupGracefulShutdown();
    } catch (error: any) {
      console.error('❌ Failed to start workers:', error.message);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown on SIGTERM/SIGINT
   */
  private static setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);

      try {
        // Close all queues
        await Promise.all([
          transcriptionQueue.close(),
          extractionQueue.close(),
          sentimentQueue.close(),
        ]);

        console.log('✅ All queues closed gracefully');
        console.log('👋 Shutdown complete\n');
        process.exit(0);
      } catch (error: any) {
        console.error('❌ Error during shutdown:', error.message);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });
  }

  /**
   * Get status of all workers (for health checks)
   */
  static async getWorkersStatus(): Promise<any> {
    try {
      const [transcriptionStats, extractionStats, sentimentStats] = await Promise.all([
        transcriptionQueue.getStats(),
        extractionQueue.getStats(),
        sentimentQueue.getStats(),
      ]);

      return {
        healthy: true,
        workers: {
          transcription: transcriptionStats,
          extraction: extractionStats,
          sentiment: sentimentStats,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default WorkerManager;

// Auto-start workers if this file is run directly
if (require.main === module) {
  WorkerManager.start();
}
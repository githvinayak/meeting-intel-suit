// TODO (Day 13): import { timelineQueue } from '../queues/timelineQueue';

import { extractionQueue } from '../queue/extractionQueue';
import { sentimentQueue } from '../queue/sentimentQueue';
import { transcriptionQueue } from '../queue/transcriptionQueue';

/**
 * Worker Manager
 * Centralized manager for starting/stopping all queue workers
 */
export class WorkerManager {
  /**
   * Start all workers
   * Called on application boot
   */
  static startAll(): void {
    console.log('\n🚀 Starting all queue workers...\n');

    try {
      // Start all workers by calling startWorker() on each queue
      transcriptionQueue.StartWorker();
      extractionQueue.StartWorker();
      sentimentQueue.StartWorker();
      // TODO (Day 13): timelineQueue.startWorker();

      console.log('\n✅ All workers started successfully');
      console.log('📊 Workers are now processing jobs from their queues...\n');

      // Setup graceful shutdown
      this.setupGracefulShutdown();
    } catch (error: any) {
      console.error('❌ Failed to start workers:', error.message);
      process.exit(1);
    }
  }

  /**
   * Stop all workers gracefully
   */
  static async stopAll(): Promise<void> {
    console.log('\n🛑 Stopping all queue workers...\n');

    try {
      await Promise.all([
        transcriptionQueue.close(),
        extractionQueue.close(),
        sentimentQueue.close(),
        // TODO (Day 13): timelineQueue.close(),
      ]);

      console.log('✅ All workers stopped\n');
    } catch (error: any) {
      console.error('❌ Error stopping workers:', error.message);
      throw error;
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private static setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);

      try {
        await this.stopAll();
        console.log('👋 Shutdown complete\n');
        process.exit(0);
      } catch (error: any) {
        console.error('❌ Error during shutdown:', error.message);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection:', promise, 'reason:', reason);
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

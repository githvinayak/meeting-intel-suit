import fs from 'fs';
import path from 'path';

const COST_LOG_PATH = path.join(__dirname, '../../logs/costs.json');

interface CostEntry {
  timestamp: Date;
  meetingId: string;
  duration: number; // seconds
  cost: number; // USD
  model: string;
}

export interface CostSummary {
  totalCost: number;
  totalMinutes: number;
  transcriptionCount: number;
  remainingCredits: number;
  entries: CostEntry[];
}

export class CostCalculator {
  private static readonly WHISPER_COST_PER_MINUTE = 0.006; // $0.006/min
  private static readonly FREE_CREDITS = 5.0; // $5 free credits

  /**
   * Calculate cost for audio duration
   */
  static calculateCost(durationInSeconds: number): number {
    const minutes = durationInSeconds / 60;
    return parseFloat((minutes * this.WHISPER_COST_PER_MINUTE).toFixed(4));
  }

  /**
   * Log a transcription cost
   */
  static async logCost(
    meetingId: string,
    durationInSeconds: number,
    model: string = 'whisper-1'
  ): Promise<void> {
    const cost = this.calculateCost(durationInSeconds);

    const entry: CostEntry = {
      timestamp: new Date(),
      meetingId,
      duration: durationInSeconds,
      cost,
      model,
    };

    // Ensure logs directory exists
    const logsDir = path.dirname(COST_LOG_PATH);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Read existing costs
    let summary = this.getCostSummary();
    summary.entries.push(entry);
    summary.totalCost += cost;
    summary.totalMinutes += durationInSeconds / 60;
    summary.transcriptionCount += 1;
    summary.remainingCredits = this.FREE_CREDITS - summary.totalCost;

    // Write updated costs
    fs.writeFileSync(COST_LOG_PATH, JSON.stringify(summary, null, 2));

    console.log(`💰 Cost logged: $${cost.toFixed(4)} for meeting ${meetingId}`);
    console.log(`📊 Total spent: $${summary.totalCost.toFixed(4)} / $${this.FREE_CREDITS}`);
    console.log(`💳 Remaining credits: $${summary.remainingCredits.toFixed(2)}`);
  }

  /**
   * Get cost summary
   */
  static getCostSummary(): CostSummary {
    if (!fs.existsSync(COST_LOG_PATH)) {
      return {
        totalCost: 0,
        totalMinutes: 0,
        transcriptionCount: 0,
        remainingCredits: this.FREE_CREDITS,
        entries: [],
      };
    }

    try {
      const data = fs.readFileSync(COST_LOG_PATH, 'utf-8');

      // Check if file is empty
      if (!data || data.trim() === '') {
        console.warn('⚠️  Cost log file is empty, initializing...');
        return {
          totalCost: 0,
          totalMinutes: 0,
          transcriptionCount: 0,
          remainingCredits: this.FREE_CREDITS,
          entries: [],
        };
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Error reading cost log:', error);

      // Return default instead of crashing
      return {
        totalCost: 0,
        totalMinutes: 0,
        transcriptionCount: 0,
        remainingCredits: this.FREE_CREDITS,
        entries: [],
      };
    }
  }

  /**
   * Check if we're approaching budget limit
   */
  static shouldWarnAboutCosts(): boolean {
    const summary = this.getCostSummary();
    return summary.remainingCredits < 1.0; // Warn if less than $1 remaining
  }

  /**
   * Get today's cost
   */
  static getTodaysCost(): number {
    const summary = this.getCostSummary();
    const today = new Date().toDateString();

    return summary.entries
      .filter((entry) => new Date(entry.timestamp).toDateString() === today)
      .reduce((sum, entry) => sum + entry.cost, 0);
  }
}

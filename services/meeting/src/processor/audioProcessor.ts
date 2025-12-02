import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config';

export interface AudioMetadata {
  duration: number; // Duration in seconds
  format: string; // mp3, wav, m4a, etc.
  size: number; // File size in bytes
  sizeMB: number; // File size in MB
  bitrate?: number; // Audio bitrate
  sampleRate?: number; // Sample rate (Hz)
  channels?: number; // Number of audio channels
}

export interface AudioChunk {
  path: string;
  index: number;
  duration: number;
  size: number;
}

export class AudioProcessor {
  private static readonly SUPPORTED_FORMATS = ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'mpeg', 'mpga'];

  private static readonly MAX_FILE_SIZE_BYTES = config.audio.maxSizeMB * 1024 * 1024;
  private static readonly WHISPER_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB (OpenAI limit)

  /**
   * Validate audio file
   */
  static async validate(filePath: string): Promise<void> {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('Audio file not found');
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const sizeMB = stats.size / (1024 * 1024);

    // Check file size
    if (stats.size > this.MAX_FILE_SIZE_BYTES) {
      throw new Error(`File too large: ${sizeMB.toFixed(2)}MB (max: ${config.audio.maxSizeMB}MB)`);
    }

    // Check file format
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    if (!this.SUPPORTED_FORMATS.includes(ext)) {
      throw new Error(
        `Unsupported format: ${ext}. Supported: ${this.SUPPORTED_FORMATS.join(', ')}`
      );
    }

    // Get metadata to check duration
    const metadata = await this.getMetadata(filePath);

    if (metadata.duration > config.audio.maxDuration) {
      throw new Error(`Audio too long: ${metadata.duration}s (max: ${config.audio.maxDuration}s)`);
    }

    console.log(
      `✅ Audio validation passed: ${sizeMB.toFixed(2)}MB, ${metadata.duration.toFixed(0)}s`
    );
  }

  /**
   * Get audio metadata using ffmpeg
   */
  static async getMetadata(filePath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to read audio metadata: ${err.message}`));
          return;
        }

        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
        if (!audioStream) {
          reject(new Error('No audio stream found in file'));
          return;
        }

        const stats = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase().replace('.', '');

        resolve({
          duration: metadata.format.duration || 0,
          format: ext,
          size: stats.size,
          sizeMB: stats.size / (1024 * 1024),
          bitrate: metadata.format.bit_rate ? Number(metadata.format.bit_rate) : undefined,
          sampleRate: audioStream.sample_rate ? Number(audioStream.sample_rate) : undefined,
          channels: audioStream.channels,
        });
      });
    });
  }

  /**
   * Check if file needs chunking (>25MB for Whisper API)
   */
  static needsChunking(fileSizeBytes: number): boolean {
    return fileSizeBytes > this.WHISPER_MAX_SIZE_BYTES;
  }

  /**
   * Split large audio file into chunks
   * This is for future implementation - for now we reject large files
   */
  static async splitIntoChunks(
    filePath: string,
    chunkDuration: number = 300 // 5 minutes per chunk
  ): Promise<AudioChunk[]> {
    const metadata = await this.getMetadata(filePath);

    // If file is small enough, no chunking needed
    if (!this.needsChunking(metadata.size)) {
      return [
        {
          path: filePath,
          index: 0,
          duration: metadata.duration,
          size: metadata.size,
        },
      ];
    }

    // Calculate number of chunks needed
    const numChunks = Math.ceil(metadata.duration / chunkDuration);
    const chunks: AudioChunk[] = [];
    const outputDir = path.join(path.dirname(filePath), 'chunks');

    // Create chunks directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📦 Splitting audio into ${numChunks} chunks...`);

    // Split file into chunks
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * chunkDuration;
      const outputPath = path.join(outputDir, `chunk_${i}_${path.basename(filePath)}`);

      await this.extractChunk(filePath, outputPath, startTime, chunkDuration);

      const chunkStats = fs.statSync(outputPath);
      chunks.push({
        path: outputPath,
        index: i,
        duration: Math.min(chunkDuration, metadata.duration - startTime),
        size: chunkStats.size,
      });

      console.log(
        `  ✓ Chunk ${i + 1}/${numChunks}: ${(chunkStats.size / (1024 * 1024)).toFixed(2)}MB`
      );
    }

    return chunks;
  }

  /**
   * Extract a chunk from audio file using ffmpeg
   */
  private static extractChunk(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Clean up chunk files
   */
  static cleanupChunks(chunks: AudioChunk[]): void {
    chunks.forEach((chunk) => {
      if (fs.existsSync(chunk.path) && chunk.path.includes('chunks')) {
        fs.unlinkSync(chunk.path);
      }
    });

    // Remove chunks directory if empty
    const chunksDir = path.dirname(chunks[0]?.path);
    if (chunksDir && chunksDir.includes('chunks') && fs.existsSync(chunksDir)) {
      const files = fs.readdirSync(chunksDir);
      if (files.length === 0) {
        fs.rmdirSync(chunksDir);
      }
    }
  }

  /**
   * Get audio duration without full metadata
   */
  static async getDuration(filePath: string): Promise<number> {
    const metadata = await this.getMetadata(filePath);
    return metadata.duration;
  }

  /**
   * Calculate estimated transcription cost
   */
  static calculateEstimatedCost(durationInSeconds: number): number {
    const minutes = durationInSeconds / 60;
    return parseFloat((minutes * 0.006).toFixed(4)); // $0.006 per minute
  }
}

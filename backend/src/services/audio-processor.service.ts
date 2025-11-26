// Audio Processor Service - Mix and finalize podcast audio using FFmpeg
import ffmpeg from 'fluent-ffmpeg';
import { PodcastTemplate } from '@prisma/client';
import { config } from '../config/env';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { AudioSegmentResult, ProcessedPodcast } from '../types/podcast.types';

// Configure FFmpeg paths for Windows
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
  logger.info(`FFmpeg path set to: ${process.env.FFMPEG_PATH}`);
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
  logger.info(`FFprobe path set to: ${process.env.FFPROBE_PATH}`);
}

export interface AudioProcessingOptions {
  podcastId: string;
  segments: AudioSegmentResult[];
  pauseBetweenSpeakers: number; // milliseconds
  template: PodcastTemplate;
  includeBackgroundMusic?: boolean;
  backgroundMusicPath?: string;
  backgroundMusicVolume?: number; // 0.0 - 1.0
  normalizeAudio?: boolean;
  outputBitrate?: string; // e.g., '192k'
}

export class AudioProcessorService {
  private outputDir: string;
  private assetsDir: string;

  constructor() {
    this.outputDir = config.podcastStoragePath;
    this.assetsDir = config.podcastAssetsPath;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.outputDir, this.assetsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Main processing pipeline
  async processPodcast(options: AudioProcessingOptions): Promise<ProcessedPodcast> {
    const {
      podcastId,
      segments,
      pauseBetweenSpeakers = 500,
      normalizeAudio = true,
      outputBitrate = '192k',
    } = options;

    logger.info(`Processing podcast: ${podcastId}, ${segments.length} segments`);

    const podcastDir = path.join(this.outputDir, podcastId);
    const outputPath = path.join(podcastDir, 'podcast.mp3');
    const tempConcatPath = path.join(podcastDir, 'concat_temp.mp3');

    // Ensure podcast directory exists
    if (!fs.existsSync(podcastDir)) {
      fs.mkdirSync(podcastDir, { recursive: true });
    }

    try {
      // Stage 1: Concatenate segments with pauses
      await this.concatenateWithPauses(segments, tempConcatPath, pauseBetweenSpeakers, podcastDir);

      // Stage 2: Add background music if requested
      let processedPath = tempConcatPath;
      if (options.includeBackgroundMusic && options.backgroundMusicPath) {
        const withMusicPath = path.join(podcastDir, 'with_music_temp.mp3');
        await this.mixBackgroundMusic(
          tempConcatPath,
          options.backgroundMusicPath,
          withMusicPath,
          options.backgroundMusicVolume || 0.15
        );
        processedPath = withMusicPath;
      }

      // Stage 3: Normalize and export
      await this.normalizeAndExport(processedPath, outputPath, normalizeAudio, outputBitrate);

      // Get final file stats
      const stats = fs.statSync(outputPath);
      const duration = await this.getAudioDuration(outputPath);

      // Cleanup temp files
      this.cleanupTempFiles(podcastDir, outputPath);

      logger.info(`Podcast processed: ${outputPath}, ${duration}s, ${stats.size} bytes`);

      return {
        filePath: outputPath,
        duration: Math.round(duration),
        fileSize: stats.size,
      };
    } catch (error) {
      logger.error(`Audio processing failed for ${podcastId}:`, error);
      throw error;
    }
  }

  // Concatenate audio segments with silence gaps using file list
  private async concatenateWithPauses(
    segments: AudioSegmentResult[],
    outputPath: string,
    pauseMs: number,
    workDir: string
  ): Promise<void> {
    // Create silence file for pauses
    const silencePath = path.join(workDir, 'silence.mp3');
    await this.generateSilence(pauseMs, silencePath);

    // Create file list for FFmpeg concat demuxer
    const listPath = path.join(workDir, 'concat_list.txt');
    const absoluteListPath = path.resolve(listPath); // Convert to absolute path for FFmpeg on Windows
    let listContent = '';

    let previousSpeaker: string | null = null;
    for (const segment of segments) {
      // Add pause between different speakers
      if (previousSpeaker && previousSpeaker !== segment.speakerId) {
        listContent += `file '${path.resolve(silencePath).replace(/\\/g, '/')}'\n`;
      }
      listContent += `file '${path.resolve(segment.filePath).replace(/\\/g, '/')}'\n`;
      previousSpeaker = segment.speakerId;
    }

    fs.writeFileSync(absoluteListPath, listContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(absoluteListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .audioFrequency(44100)
        .audioChannels(2)
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug(`FFmpeg concat command: ${commandLine}`);
        })
        .on('end', () => {
          // Cleanup temp files
          try {
            if (fs.existsSync(absoluteListPath)) fs.unlinkSync(absoluteListPath);
            if (fs.existsSync(silencePath)) fs.unlinkSync(silencePath);
          } catch {
            // Ignore cleanup errors
          }
          resolve();
        })
        .on('error', (err) => {
          logger.error('FFmpeg concat error:', err);
          reject(err);
        })
        .run();
    });
  }

  // Generate silence audio file (Windows-compatible, no lavfi required)
  private async generateSilence(durationMs: number, outputPath: string): Promise<void> {
    // Create silence by using a null input and generating empty audio frames
    // This approach works without lavfi by using pcm generation
    const durationSec = durationMs / 1000;

    return new Promise((resolve, reject) => {
      // Generate raw PCM silence data using ffmpeg's built-in tone generator
      // with volume 0, which works without lavfi
      const sampleRate = 44100;
      const channels = 2;
      const bytesPerSample = 2; // 16-bit audio
      const totalSamples = Math.ceil(sampleRate * durationSec);
      const bufferSize = totalSamples * channels * bytesPerSample;

      // Create buffer of silence (zeros)
      const silenceBuffer = Buffer.alloc(bufferSize, 0);
      const rawSilencePath = outputPath.replace('.mp3', '.raw');

      // Write raw PCM silence file
      fs.writeFileSync(rawSilencePath, silenceBuffer);

      // Convert raw PCM to MP3
      ffmpeg()
        .input(rawSilencePath)
        .inputOptions([
          '-f', 's16le',           // Signed 16-bit little-endian PCM
          '-ar', String(sampleRate),
          '-ac', String(channels),
        ])
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .output(outputPath)
        .on('end', () => {
          // Cleanup raw file
          try {
            if (fs.existsSync(rawSilencePath)) {
              fs.unlinkSync(rawSilencePath);
            }
          } catch {
            // Ignore cleanup errors
          }
          resolve();
        })
        .on('error', (err) => {
          logger.error('FFmpeg silence generation error:', err);
          // Cleanup raw file on error
          try {
            if (fs.existsSync(rawSilencePath)) {
              fs.unlinkSync(rawSilencePath);
            }
          } catch {
            // Ignore cleanup errors
          }
          reject(err);
        })
        .run();
    });
  }

  // Mix main audio with background music
  private async mixBackgroundMusic(
    mainPath: string,
    bgMusicPath: string,
    outputPath: string,
    bgVolume: number
  ): Promise<void> {
    if (!fs.existsSync(bgMusicPath)) {
      logger.warn(`Background music not found: ${bgMusicPath}, skipping`);
      fs.copyFileSync(mainPath, outputPath);
      return;
    }

    const voiceDuration = await this.getAudioDuration(mainPath);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(mainPath)
        .input(bgMusicPath)
        .complexFilter([
          // Loop background music to match voice duration and reduce volume
          `[1:a]aloop=loop=-1:size=2e+09,atrim=0:${voiceDuration},volume=${bgVolume}[bg]`,
          // Mix voice with background
          `[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[outa]`,
        ])
        .outputOptions(['-map', '[outa]'])
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug(`FFmpeg mix command: ${commandLine}`);
        })
        .on('end', () => resolve())
        .on('error', (err) => {
          logger.error('FFmpeg mix error:', err);
          reject(err);
        })
        .run();
    });
  }

  // Normalize audio levels and final export
  private async normalizeAndExport(
    inputPath: string,
    outputPath: string,
    normalize: boolean,
    bitrate: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg().input(inputPath);

      if (normalize) {
        // Apply loudness normalization (broadcast standard)
        command = command.audioFilters(['loudnorm=I=-16:TP=-1.5:LRA=11']);
      }

      command
        .audioCodec('libmp3lame')
        .audioBitrate(bitrate)
        .audioFrequency(44100)
        .audioChannels(2)
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug(`FFmpeg normalize command: ${commandLine}`);
        })
        .on('end', () => resolve())
        .on('error', (err) => {
          logger.error('FFmpeg normalize error:', err);
          reject(err);
        })
        .run();
    });
  }

  // Get audio duration using FFprobe
  async getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error('FFprobe error:', err);
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  // Silence removal (optional enhancement)
  async removeSilence(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputPath)
        .audioFilters([
          'silenceremove=start_periods=1:start_duration=0.1:start_threshold=-50dB:detection=peak',
          'silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-50dB:detection=peak',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  // Cleanup temporary files in podcast directory, preserving final output
  private cleanupTempFiles(podcastDir: string, finalOutputPath: string): void {
    const files = fs.readdirSync(podcastDir);

    for (const file of files) {
      const filePath = path.join(podcastDir, file);

      // Keep the final output and segments directory
      if (filePath === finalOutputPath || file === 'segments') {
        continue;
      }

      // Delete temp files
      if (file.includes('_temp') || file === 'concat_list.txt' || file === 'silence.mp3') {
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }

  // Delete entire podcast directory
  async deletePodcastFiles(podcastId: string): Promise<void> {
    const podcastDir = path.join(this.outputDir, podcastId);

    if (fs.existsSync(podcastDir)) {
      try {
        fs.rmSync(podcastDir, { recursive: true, force: true });
        logger.info(`Deleted podcast files: ${podcastDir}`);
      } catch (error) {
        logger.error(`Failed to delete podcast files: ${podcastDir}`, error);
      }
    }
  }

  // Check if FFmpeg is available
  async checkFFmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err) => {
        if (err) {
          logger.error('FFmpeg not available:', err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}

// Singleton instance
let audioProcessorInstance: AudioProcessorService | null = null;

export function getAudioProcessorService(): AudioProcessorService {
  if (!audioProcessorInstance) {
    audioProcessorInstance = new AudioProcessorService();
  }
  return audioProcessorInstance;
}

export default AudioProcessorService;

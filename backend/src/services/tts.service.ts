// TTS Service - Text-to-Speech using OpenAI TTS API
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import {
  TTSSegment,
  AudioSegmentResult,
  VOICE_MAPPING,
} from '../types/podcast.types';

const prisma = new PrismaClient();

type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface TTSServiceConfig {
  model: 'tts-1' | 'tts-1-hd';
  maxConcurrentRequests: number;
  retryAttempts: number;
  retryDelayMs: number;
  rateLimitRequestsPerMinute: number;
}

export class TTSService {
  private client: OpenAI;
  private config: TTSServiceConfig;
  private requestCount = 0;
  private lastRequestTime = 0;
  private tempDir: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
      timeout: 60000,
      maxRetries: 3,
    });

    this.config = {
      model: (config.openaiTtsModel as 'tts-1' | 'tts-1-hd') || 'tts-1-hd',
      maxConcurrentRequests: config.podcastMaxConcurrentTTS || 3,
      retryAttempts: 3,
      retryDelayMs: 1000,
      rateLimitRequestsPerMinute: 50,
    };

    this.tempDir = path.join(config.podcastStoragePath, 'temp');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Rate limiting implementation
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = (60 * 1000) / this.config.rateLimitRequestsPerMinute;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Map speaker ID to OpenAI voice
  private getVoiceForSpeaker(speakerId: string): { voiceId: OpenAIVoice; speed: number } {
    const voiceConfig = VOICE_MAPPING[speakerId.toLowerCase()];
    if (voiceConfig) {
      return {
        voiceId: voiceConfig.voiceId as OpenAIVoice,
        speed: voiceConfig.speed,
      };
    }
    // Default fallback
    return { voiceId: 'nova', speed: 1.0 };
  }

  // Get voice config from database host
  async getVoiceFromHost(hostId: string): Promise<{ voiceId: OpenAIVoice; speed: number }> {
    const host = await prisma.podcastHost.findUnique({
      where: { id: hostId },
    });

    if (host) {
      return {
        voiceId: host.voice.toLowerCase() as OpenAIVoice,
        speed: Number(host.voiceSpeed) || 1.0,
      };
    }

    return { voiceId: 'nova', speed: 1.0 };
  }

  // Adjust speed based on pacing notes
  private adjustSpeedForPacing(baseSpeed: number, pacing?: string): number {
    switch (pacing) {
      case 'slow':
        return Math.max(0.75, baseSpeed - 0.1);
      case 'energetic':
        return Math.min(1.25, baseSpeed + 0.15);
      default:
        return baseSpeed;
    }
  }

  // Estimate audio duration from text
  private estimateDuration(text: string, speed: number): number {
    // Average speaking rate: ~155 words per minute at 1.0x speed
    const wordCount = text.split(/\s+/).length;
    const minutesAtNormalSpeed = wordCount / 155;
    const actualMinutes = minutesAtNormalSpeed / speed;
    return Math.round(actualMinutes * 60 * 10) / 10; // Round to 0.1s
  }

  // Generate a single speech segment with retry logic
  async generateSegment(
    segment: TTSSegment,
    podcastId: string,
    index: number
  ): Promise<AudioSegmentResult> {
    const voiceConfig = this.getVoiceForSpeaker(segment.speakerId);
    const speed = this.adjustSpeedForPacing(voiceConfig.speed, segment.pacing);

    const filename = `segment_${String(index).padStart(4, '0')}_${segment.speakerId}.mp3`;
    const podcastDir = path.join(config.podcastStoragePath, podcastId, 'segments');

    if (!fs.existsSync(podcastDir)) {
      fs.mkdirSync(podcastDir, { recursive: true });
    }

    const filePath = path.join(podcastDir, filename);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.waitForRateLimit();

        logger.debug(
          `TTS request: speaker=${segment.speakerId}, voice=${voiceConfig.voiceId}, attempt=${attempt}`
        );

        const response = await this.client.audio.speech.create({
          model: this.config.model,
          voice: voiceConfig.voiceId,
          input: segment.text,
          speed: speed,
          response_format: 'mp3',
        });

        // Write audio buffer to file
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        // Estimate duration
        const estimatedDuration = this.estimateDuration(segment.text, speed);

        logger.debug(`TTS segment generated: ${filePath}, ~${estimatedDuration}s`);

        return {
          speakerId: segment.speakerId,
          text: segment.text,
          filePath,
          duration: estimatedDuration,
          characterCount: segment.text.length,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.isRateLimitError(error)) {
          const waitTime = this.getRetryAfter(error) || this.config.retryDelayMs * attempt;
          logger.warn(
            `Rate limited, waiting ${waitTime}ms before retry ${attempt}/${this.config.retryAttempts}`
          );
          await this.sleep(waitTime);
        } else if (attempt < this.config.retryAttempts) {
          const backoff = this.config.retryDelayMs * Math.pow(2, attempt - 1);
          logger.warn(`TTS error, retrying in ${backoff}ms: ${lastError.message}`);
          await this.sleep(backoff);
        }
      }
    }

    throw new Error(
      `TTS generation failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`
    );
  }

  // Generate all segments with concurrency control
  async generateAllSegments(
    segments: TTSSegment[],
    podcastId: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<AudioSegmentResult[]> {
    const results: AudioSegmentResult[] = [];
    const total = segments.length;

    // Process in batches to control concurrency
    for (let i = 0; i < segments.length; i += this.config.maxConcurrentRequests) {
      const batch = segments.slice(i, i + this.config.maxConcurrentRequests);

      const batchResults = await Promise.all(
        batch.map((segment, batchIndex) =>
          this.generateSegment(segment, podcastId, i + batchIndex)
        )
      );

      results.push(...batchResults);

      if (onProgress) {
        onProgress(results.length, total);
      }

      logger.info(`TTS progress: ${results.length}/${total} segments generated`);
    }

    return results;
  }

  // Calculate cost estimate
  estimateCost(totalCharacters: number): { cost: number; breakdown: string } {
    // OpenAI TTS pricing: $15 per 1M characters for tts-1, $30 for tts-1-hd
    const pricePerMillion = this.config.model === 'tts-1-hd' ? 30 : 15;
    const cost = (totalCharacters / 1_000_000) * pricePerMillion;

    return {
      cost: Math.round(cost * 1000) / 1000,
      breakdown: `${totalCharacters.toLocaleString()} characters @ $${pricePerMillion}/1M = $${cost.toFixed(3)}`,
    };
  }

  // Clean up temporary files for a podcast
  async cleanupTempFiles(podcastId: string): Promise<void> {
    const podcastDir = path.join(config.podcastStoragePath, podcastId, 'segments');

    if (!fs.existsSync(podcastDir)) return;

    const files = fs.readdirSync(podcastDir);

    for (const file of files) {
      try {
        fs.unlinkSync(path.join(podcastDir, file));
      } catch (error) {
        logger.warn(`Failed to delete temp file: ${file}`);
      }
    }

    // Try to remove directory
    try {
      fs.rmdirSync(podcastDir);
    } catch {
      // Directory may not be empty or not exist
    }
  }

  // Clean up stale temp files older than specified age
  async cleanupStaleTempFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    if (!fs.existsSync(this.tempDir)) return 0;

    const now = Date.now();
    let deleted = 0;

    const files = fs.readdirSync(this.tempDir);
    for (const file of files) {
      const filePath = path.join(this.tempDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > maxAgeMs) {
        try {
          fs.unlinkSync(filePath);
          deleted++;
        } catch {
          // Ignore deletion errors
        }
      }
    }

    return deleted;
  }

  private isRateLimitError(error: unknown): boolean {
    return error instanceof OpenAI.APIError && error.status === 429;
  }

  private getRetryAfter(error: unknown): number | undefined {
    if (error instanceof OpenAI.APIError) {
      const retryAfter = error.headers?.['retry-after'];
      return retryAfter ? parseInt(retryAfter as string) * 1000 : undefined;
    }
    return undefined;
  }

  // Test TTS connection
  async testConnection(): Promise<boolean> {
    try {
      // Generate a very short test audio
      const response = await this.client.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: 'Test.',
        response_format: 'mp3',
      });

      return response !== null;
    } catch (error) {
      logger.error('TTS connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let ttsServiceInstance: TTSService | null = null;

export function getTTSService(): TTSService {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TTSService();
  }
  return ttsServiceInstance;
}

export default TTSService;

// Podcast Processor - Background job processor for podcast generation
import { PrismaClient } from '@prisma/client';
import { getPodcastService } from './podcast.service';
import { config } from '../config/env';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class PodcastProcessor {
  private intervalId: NodeJS.Timeout | null = null;
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private processing = new Set<string>();
  private maxConcurrent = 1; // Podcasts are resource-intensive, process one at a time
  private pollIntervalMs: number;
  private cleanupIntervalMs = 60 * 60 * 1000; // 1 hour
  private isRunning = false;

  constructor() {
    this.pollIntervalMs = config.podcastPollIntervalMs || 10000;
  }

  // Start the processor
  start(): void {
    if (this.isRunning) {
      logger.warn('Podcast processor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Podcast processor started');

    // Initial run
    this.processPendingPodcasts().catch((err) => {
      logger.error('Initial podcast processing failed:', err);
    });

    // Set up polling interval
    this.intervalId = setInterval(() => {
      this.processPendingPodcasts().catch((err) => {
        logger.error('Podcast processing failed:', err);
      });
    }, this.pollIntervalMs);

    // Set up cleanup interval
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpired().catch((err) => {
        logger.error('Podcast cleanup failed:', err);
      });
    }, this.cleanupIntervalMs);

    // Initial cleanup
    this.cleanupExpired().catch((err) => {
      logger.error('Initial podcast cleanup failed:', err);
    });
  }

  // Stop the processor gracefully
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    // Wait for in-progress jobs to complete (with timeout)
    const timeout = 120000; // 2 minutes for podcasts (they take longer)
    const start = Date.now();

    while (this.processing.size > 0 && Date.now() - start < timeout) {
      logger.info(`Waiting for ${this.processing.size} podcast jobs to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (this.processing.size > 0) {
      logger.warn(`Stopping with ${this.processing.size} podcast jobs still in progress`);
    }

    logger.info('Podcast processor stopped');
  }

  // Process pending podcast jobs
  private async processPendingPodcasts(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Check how many we can process
    const availableSlots = this.maxConcurrent - this.processing.size;
    if (availableSlots <= 0) {
      return;
    }

    // Fetch pending jobs
    const pendingJobs = await prisma.podcastGeneration.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: availableSlots,
    });

    // Process each job
    for (const job of pendingJobs) {
      if (this.processing.has(job.id)) {
        continue;
      }

      this.processing.add(job.id);
      this.processJob(job.id)
        .catch((err) => {
          logger.error(`Failed to process podcast ${job.id}:`, err);
        })
        .finally(() => {
          this.processing.delete(job.id);
        });
    }

    // Also check for stale processing jobs
    await this.handleStaleJobs();

    // Check for retryable failed jobs
    await this.processRetryableJobs();
  }

  // Process a single job
  private async processJob(podcastId: string): Promise<void> {
    logger.info(`Processing podcast job: ${podcastId}`);

    const podcastService = getPodcastService();

    try {
      await podcastService.processPodcast(podcastId);
      logger.info(`Podcast job completed: ${podcastId}`);

      // Check for pending deliveries and trigger them
      await this.triggerPendingDeliveries(podcastId);
    } catch (error) {
      logger.error(`Podcast job failed: ${podcastId}`, error);
    }
  }

  // Trigger pending deliveries for a completed podcast
  private async triggerPendingDeliveries(podcastId: string): Promise<void> {
    try {
      const pendingDeliveries = await prisma.podcastDelivery.findMany({
        where: {
          podcastId,
          status: 'PENDING',
        },
      });

      if (pendingDeliveries.length === 0) {
        return;
      }

      logger.info(`Found ${pendingDeliveries.length} pending delivery(ies) for podcast ${podcastId}`);

      // Import WebexDeliveryService dynamically to avoid circular dependencies
      const { getWebexDeliveryService } = await import('./webex-delivery.service');
      const webexDeliveryService = getWebexDeliveryService();

      for (const delivery of pendingDeliveries) {
        try {
          await webexDeliveryService.deliverPodcast(delivery.id);
          logger.info(`Triggered podcast delivery: ${delivery.id}`);
        } catch (error) {
          logger.error(`Failed to trigger podcast delivery ${delivery.id}:`, error);
        }
      }
    } catch (error) {
      logger.error(`Failed to trigger pending deliveries for podcast ${podcastId}:`, error);
    }
  }

  // Handle jobs stuck in processing state
  private async handleStaleJobs(): Promise<void> {
    // Podcasts can take a while, so use a longer threshold
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

    const staleJobs = await prisma.podcastGeneration.findMany({
      where: {
        status: {
          in: ['GENERATING_SCRIPT', 'GENERATING_AUDIO', 'MIXING'],
        },
        startedAt: { lt: staleThreshold },
      },
    });

    for (const job of staleJobs) {
      if (this.processing.has(job.id)) {
        continue; // Still being processed by us
      }

      logger.warn(`Found stale podcast job: ${job.id}, marking as failed`);

      await prisma.podcastGeneration.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: 'Job timed out and was marked as failed',
          retryCount: job.retryCount + 1,
        },
      });
    }
  }

  // Process jobs that failed but are eligible for retry
  private async processRetryableJobs(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    const retryableJobs = await prisma.podcastGeneration.findMany({
      where: {
        status: 'FAILED',
        retryCount: { lt: 3 }, // Max 3 retries
      },
      orderBy: { updatedAt: 'asc' },
      take: 1,
    });

    for (const job of retryableJobs) {
      if (this.processing.has(job.id)) {
        continue;
      }

      // Add a delay before retrying to avoid hammering
      const timeSinceFailure = Date.now() - job.updatedAt.getTime();
      const minRetryDelay = 60 * 1000; // 1 minute minimum

      if (timeSinceFailure < minRetryDelay) {
        continue;
      }

      logger.info(`Retrying failed podcast job: ${job.id} (attempt ${job.retryCount + 1})`);

      // Reset to pending
      await prisma.podcastGeneration.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          startedAt: null,
          error: null,
        },
      });
    }
  }

  // Cleanup expired podcasts
  private async cleanupExpired(): Promise<void> {
    const podcastService = getPodcastService();

    try {
      const deleted = await podcastService.cleanupExpiredPodcasts();
      if (deleted > 0) {
        logger.info(`Cleaned up ${deleted} expired podcasts`);
      }
    } catch (error) {
      logger.error('Failed to cleanup expired podcasts:', error);
    }
  }

  // Get processor status
  getStatus(): {
    isRunning: boolean;
    activeJobs: number;
    pollIntervalMs: number;
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.processing.size,
      pollIntervalMs: this.pollIntervalMs,
    };
  }

  // Get queue statistics
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      prisma.podcastGeneration.count({ where: { status: 'PENDING' } }),
      prisma.podcastGeneration.count({
        where: { status: { in: ['GENERATING_SCRIPT', 'GENERATING_AUDIO', 'MIXING'] } },
      }),
      prisma.podcastGeneration.count({ where: { status: 'COMPLETED' } }),
      prisma.podcastGeneration.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed,
    };
  }
}

// Singleton instance
let processorInstance: PodcastProcessor | null = null;

export function getPodcastProcessor(): PodcastProcessor {
  if (!processorInstance) {
    processorInstance = new PodcastProcessor();
  }
  return processorInstance;
}

export default PodcastProcessor;

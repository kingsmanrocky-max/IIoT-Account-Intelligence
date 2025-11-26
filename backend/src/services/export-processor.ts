// Export Processor - Background job processor for document exports
import { PrismaClient } from '@prisma/client';
import { getExportService } from './export.service';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class ExportProcessor {
  private intervalId: NodeJS.Timeout | null = null;
  private processing = new Set<string>();
  private maxConcurrent = 2;
  private pollIntervalMs = 5000; // 5 seconds
  private isRunning = false;

  // Start the processor
  start(): void {
    if (this.isRunning) {
      logger.warn('Export processor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Export processor started');

    // Initial run
    this.processPendingExports().catch((err) => {
      logger.error('Initial export processing failed:', err);
    });

    // Set up interval
    this.intervalId = setInterval(() => {
      this.processPendingExports().catch((err) => {
        logger.error('Export processing failed:', err);
      });
    }, this.pollIntervalMs);
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

    // Wait for in-progress jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();

    while (this.processing.size > 0 && Date.now() - start < timeout) {
      logger.info(`Waiting for ${this.processing.size} export jobs to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.processing.size > 0) {
      logger.warn(`Stopping with ${this.processing.size} jobs still in progress`);
    }

    logger.info('Export processor stopped');
  }

  // Process pending export jobs
  private async processPendingExports(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Check how many we can process
    const availableSlots = this.maxConcurrent - this.processing.size;
    if (availableSlots <= 0) {
      return;
    }

    // Fetch pending jobs
    const pendingJobs = await prisma.documentExport.findMany({
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
          logger.error(`Failed to process export ${job.id}:`, err);
        })
        .finally(() => {
          this.processing.delete(job.id);
        });
    }

    // Also check for stale processing jobs
    await this.handleStaleJobs();
  }

  // Process a single job
  private async processJob(exportId: string): Promise<void> {
    logger.info(`Processing export job: ${exportId}`);

    const exportService = getExportService();

    try {
      await exportService.processExport(exportId);
      logger.info(`Export job completed: ${exportId}`);
    } catch (error) {
      logger.error(`Export job failed: ${exportId}`, error);
    }
  }

  // Handle jobs stuck in PROCESSING state
  private async handleStaleJobs(): Promise<void> {
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes

    const staleJobs = await prisma.documentExport.findMany({
      where: {
        status: 'PROCESSING',
        startedAt: { lt: staleThreshold },
      },
    });

    for (const job of staleJobs) {
      if (this.processing.has(job.id)) {
        continue; // Still being processed by us
      }

      logger.warn(`Found stale export job: ${job.id}, resetting to PENDING`);

      await prisma.documentExport.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          startedAt: null,
          retryCount: job.retryCount + 1,
          error: 'Job timed out and was reset',
        },
      });
    }
  }

  // Get processor status
  getStatus(): { isRunning: boolean; activeJobs: number } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.processing.size,
    };
  }
}

// Singleton instance
let processorInstance: ExportProcessor | null = null;

export function getExportProcessor(): ExportProcessor {
  if (!processorInstance) {
    processorInstance = new ExportProcessor();
  }
  return processorInstance;
}

export default ExportProcessor;

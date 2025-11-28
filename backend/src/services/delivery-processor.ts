// Delivery Processor - Background job processor for Webex deliveries
import { PrismaClient } from '@prisma/client';
import { getWebexDeliveryService } from './webex-delivery.service';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class DeliveryProcessor {
  private intervalId: NodeJS.Timeout | null = null;
  private processing = new Set<string>();
  private maxConcurrent = 3;
  private pollIntervalMs = 5000; // 5 seconds
  private isRunning = false;

  // Start the processor
  start(): void {
    if (this.isRunning) {
      logger.warn('Delivery processor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Delivery processor started');

    // Initial run
    this.processPendingDeliveries().catch((err) => {
      logger.error('Initial delivery processing failed:', err);
    });

    // Set up interval
    this.intervalId = setInterval(() => {
      this.processPendingDeliveries().catch((err) => {
        logger.error('Delivery processing failed:', err);
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
      logger.info(`Waiting for ${this.processing.size} delivery jobs to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.processing.size > 0) {
      logger.warn(`Stopping with ${this.processing.size} delivery jobs still in progress`);
    }

    logger.info('Delivery processor stopped');
  }

  // Process pending delivery jobs
  private async processPendingDeliveries(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Check how many we can process
    const availableSlots = this.maxConcurrent - this.processing.size;
    if (availableSlots <= 0) {
      return;
    }

    // Fetch pending Webex delivery jobs
    const pendingJobs = await prisma.reportDelivery.findMany({
      where: {
        status: 'PENDING',
        method: 'WEBEX',
      },
      orderBy: { createdAt: 'asc' },
      take: availableSlots,
    });

    if (pendingJobs.length > 0) {
      logger.info(`Found ${pendingJobs.length} pending WEBEX delivery job(s)`, {
        jobs: pendingJobs.map(j => ({
          id: j.id,
          reportId: j.reportId,
          destination: j.destination,
          contentType: j.contentType,
        })),
      });
    }

    // Process each job
    for (const job of pendingJobs) {
      if (this.processing.has(job.id)) {
        logger.debug(`Delivery ${job.id} already processing, skipping`);
        continue;
      }

      this.processing.add(job.id);
      logger.info(`Starting delivery processing`, {
        deliveryId: job.id,
        reportId: job.reportId,
        destination: job.destination,
      });

      this.processJob(job.id)
        .catch((err) => {
          logger.error(`Failed to process delivery ${job.id}:`, err);
        })
        .finally(() => {
          this.processing.delete(job.id);
        });
    }

    // Also check for stale processing jobs
    await this.handleStaleJobs();
  }

  // Process a single job
  private async processJob(deliveryId: string): Promise<void> {
    logger.info(`Processing delivery job: ${deliveryId}`);

    const webexService = getWebexDeliveryService();

    try {
      const result = await webexService.deliverReport(deliveryId);

      // Fetch delivery and report details for logging to WebexInteraction
      const delivery = await prisma.reportDelivery.findUnique({
        where: { id: deliveryId },
        include: { report: true },
      });

      if (!delivery) {
        logger.error(`Delivery ${deliveryId} not found after processing`);
        return;
      }

      if (result.success) {
        logger.info(`Delivery job completed: ${deliveryId}`);

        // Log successful delivery to WebexInteraction feed
        const inputData = delivery.report.inputData as any;
        await prisma.webexInteraction.create({
          data: {
            userEmail: delivery.destination,
            messageText: `Delivery completed for report: ${delivery.report.title}`,
            workflowType: delivery.report.workflowType,
            targetCompany: inputData?.companyName || null,
            responseType: 'DELIVERY_SENT',
            reportId: delivery.report.id,
            success: true,
            messageId: result.messageId || null,
          },
        });

        logger.info(`WebexInteraction logged for successful delivery ${deliveryId}`);
      } else {
        logger.warn(`Delivery job failed: ${deliveryId} - ${result.error}`);

        // Log failed delivery to WebexInteraction feed
        const inputData = delivery.report.inputData as any;
        await prisma.webexInteraction.create({
          data: {
            userEmail: delivery.destination,
            messageText: `Delivery failed for report: ${delivery.report.title}`,
            workflowType: delivery.report.workflowType,
            targetCompany: inputData?.companyName || null,
            responseType: 'DELIVERY_FAILED',
            reportId: delivery.report.id,
            success: false,
            errorMessage: result.error || 'Unknown error',
          },
        });

        logger.info(`WebexInteraction logged for failed delivery ${deliveryId}`);
      }
    } catch (error) {
      logger.error(`Delivery job error: ${deliveryId}`, error);
    }
  }

  // Handle jobs stuck in a bad state (should not happen with current design, but good to have)
  private async handleStaleJobs(): Promise<void> {
    // Find deliveries that have been PENDING for too long without being processed
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

    const staleJobs = await prisma.reportDelivery.findMany({
      where: {
        status: 'PENDING',
        method: 'WEBEX',
        createdAt: { lt: staleThreshold },
        retryCount: { gte: 3 }, // Only mark as failed if retries exhausted
      },
    });

    for (const job of staleJobs) {
      if (this.processing.has(job.id)) {
        continue; // Still being processed by us
      }

      logger.warn(`Found stale delivery job: ${job.id}, marking as failed`);

      await prisma.reportDelivery.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: 'Delivery timed out after maximum retries',
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
let processorInstance: DeliveryProcessor | null = null;

export function getDeliveryProcessor(): DeliveryProcessor {
  if (!processorInstance) {
    processorInstance = new DeliveryProcessor();
  }
  return processorInstance;
}

export default DeliveryProcessor;

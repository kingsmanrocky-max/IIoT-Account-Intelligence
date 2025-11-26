// Schedule Processor - Background job processor for scheduled report generation
import { getScheduleService } from './schedule.service';
import { getUserTemplateService } from './user-template.service';
import logger from '../utils/logger';

export class ScheduleProcessor {
  private intervalId: NodeJS.Timeout | null = null;
  private processing = new Set<string>();
  private maxConcurrent = 2;
  private pollIntervalMs = 60000; // 1 minute
  private isRunning = false;

  // Start the processor
  start(): void {
    if (this.isRunning) {
      logger.warn('Schedule processor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Schedule processor started');

    // Initial run
    this.processDueSchedules().catch((err) => {
      logger.error('Initial schedule processing failed:', err);
    });

    // Set up interval
    this.intervalId = setInterval(() => {
      this.processDueSchedules().catch((err) => {
        logger.error('Schedule processing failed:', err);
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
    const timeout = 60000; // 60 seconds for report generation
    const start = Date.now();

    while (this.processing.size > 0 && Date.now() - start < timeout) {
      logger.info(`Waiting for ${this.processing.size} schedule jobs to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.processing.size > 0) {
      logger.warn(`Stopping with ${this.processing.size} jobs still in progress`);
    }

    logger.info('Schedule processor stopped');
  }

  // Process schedules that are due to run
  private async processDueSchedules(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Check how many we can process
    const availableSlots = this.maxConcurrent - this.processing.size;
    if (availableSlots <= 0) {
      return;
    }

    const scheduleService = getScheduleService();

    try {
      // Get schedules that are due
      const dueSchedules = await scheduleService.getDueSchedules();

      if (dueSchedules.length === 0) {
        return;
      }

      logger.info(`Found ${dueSchedules.length} due schedules`);

      // Process schedules (up to available slots)
      const toProcess = dueSchedules
        .filter((s) => !this.processing.has(s.id))
        .slice(0, availableSlots);

      for (const schedule of toProcess) {
        this.processSchedule(schedule).catch((err) => {
          logger.error(`Failed to process schedule ${schedule.id}:`, err);
        });
      }
    } catch (error) {
      logger.error('Error fetching due schedules:', error);
    }
  }

  // Process a single schedule
  private async processSchedule(schedule: any): Promise<void> {
    if (this.processing.has(schedule.id)) {
      return;
    }

    this.processing.add(schedule.id);
    const scheduleService = getScheduleService();
    const templateService = getUserTemplateService();

    try {
      logger.info(`Processing schedule ${schedule.id}: ${schedule.name}`);

      // Get the template
      if (!schedule.template) {
        throw new Error('Schedule has no associated template');
      }

      // Generate title with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const title = `${schedule.name} - ${timestamp}`;

      // For scheduled reports, we need default company info
      // This should come from the template's configuration or a default
      // For now, we'll check if there's company info in additional context
      let companyName: string | undefined;
      let companyNames: string[] | undefined;

      // Check if we have default company settings in schedule or template
      // These would need to be added to the schema/configuration
      // For now, log a warning if not present
      if (schedule.template.workflowType !== 'NEWS_DIGEST') {
        // For AI and CI, we need a company name
        // This is a limitation - scheduled reports need pre-configured targets
        logger.warn(`Schedule ${schedule.id} may need company configuration for ${schedule.template.workflowType}`);
        // Skip if no company configured
        // In production, this would come from schedule configuration
        await scheduleService.markScheduleExecuted(schedule.id);
        return;
      }

      // Apply template to create report
      const report = await templateService.applyTemplate(schedule.templateId, schedule.userId, {
        title,
        companyName,
        companyNames: companyNames || [],
      });

      logger.info(`Schedule ${schedule.id} created report ${report.id}`);

      // Mark schedule as executed and update next run
      await scheduleService.markScheduleExecuted(schedule.id);

      logger.info(`Schedule ${schedule.id} processed successfully`);
    } catch (error) {
      logger.error(`Error processing schedule ${schedule.id}:`, error);

      // Update next run even on failure to avoid infinite retry
      try {
        await scheduleService.markScheduleExecuted(schedule.id);
      } catch (updateError) {
        logger.error(`Failed to update schedule ${schedule.id} after error:`, updateError);
      }
    } finally {
      this.processing.delete(schedule.id);
    }
  }
}

// Singleton instance
let processorInstance: ScheduleProcessor | null = null;

export function getScheduleProcessor(): ScheduleProcessor {
  if (!processorInstance) {
    processorInstance = new ScheduleProcessor();
  }
  return processorInstance;
}

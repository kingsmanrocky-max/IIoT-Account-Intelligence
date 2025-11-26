// Cleanup Processor - Background job for data retention and cleanup
import { PrismaClient } from '@prisma/client';
import { getAdminService } from './admin.service';
import { getActivityTrackingService } from './activity-tracking.service';
import logger from '../utils/logger';
import fs from 'fs/promises';

const prisma = new PrismaClient();

export interface CleanupStats {
  reportsDeleted: number;
  exportsDeleted: number;
  activitiesDeleted: number;
  analyticsDeleted: number;
  filesDeleted: number;
  bytesFreed: number;
  duration: number;
}

export class CleanupProcessor {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isProcessing = false;

  // Start the cleanup processor (runs daily at 2 AM by default)
  start(): void {
    if (this.isRunning) {
      logger.warn('Cleanup processor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Cleanup processor started');

    // Schedule next run
    this.scheduleNextRun();
  }

  // Stop the cleanup processor
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    // Wait for current processing to complete
    const timeout = 60000; // 1 minute
    const start = Date.now();

    while (this.isProcessing && Date.now() - start < timeout) {
      logger.info('Waiting for cleanup job to complete...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info('Cleanup processor stopped');
  }

  // Schedule next cleanup run
  private scheduleNextRun(): void {
    if (!this.isRunning) return;

    const now = new Date();
    const next2AM = new Date(now);
    next2AM.setHours(2, 0, 0, 0);

    // If 2 AM has passed today, schedule for tomorrow
    if (next2AM <= now) {
      next2AM.setDate(next2AM.getDate() + 1);
    }

    const delay = next2AM.getTime() - now.getTime();

    this.intervalId = setTimeout(() => {
      this.runCleanup().catch((err) => {
        logger.error('Scheduled cleanup failed:', err);
      });
      this.scheduleNextRun();
    }, delay);

    logger.info(`Next cleanup scheduled for ${next2AM.toISOString()}`);
  }

  // Run the cleanup job
  async runCleanup(): Promise<CleanupStats> {
    if (this.isProcessing) {
      logger.warn('Cleanup already in progress');
      return {
        reportsDeleted: 0,
        exportsDeleted: 0,
        activitiesDeleted: 0,
        analyticsDeleted: 0,
        filesDeleted: 0,
        bytesFreed: 0,
        duration: 0,
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();

    const stats: CleanupStats = {
      reportsDeleted: 0,
      exportsDeleted: 0,
      activitiesDeleted: 0,
      analyticsDeleted: 0,
      filesDeleted: 0,
      bytesFreed: 0,
      duration: 0,
    };

    try {
      logger.info('Starting cleanup job...');

      // Get retention settings
      const adminService = getAdminService();
      const settings = await adminService.getSettings();
      const retentionDays = settings.reportRetentionDays;

      const reportCutoff = new Date();
      reportCutoff.setDate(reportCutoff.getDate() - retentionDays);

      const activityCutoff = new Date();
      activityCutoff.setDate(activityCutoff.getDate() - 90); // 90 days for activities

      const analyticsCutoff = new Date();
      analyticsCutoff.setFullYear(analyticsCutoff.getFullYear() - 1); // 1 year for analytics

      logger.info(`Report retention: ${retentionDays} days, cutoff: ${reportCutoff.toISOString()}`);

      // 1. Find old reports and their exports
      const oldReports = await prisma.report.findMany({
        where: { createdAt: { lt: reportCutoff } },
        include: { documentExports: true },
      });

      logger.info(`Found ${oldReports.length} reports to delete`);

      // 2. Delete associated files
      for (const report of oldReports) {
        for (const exp of report.documentExports) {
          if (exp.filePath) {
            try {
              const fileStat = await fs.stat(exp.filePath);
              await fs.unlink(exp.filePath);
              stats.filesDeleted++;
              stats.bytesFreed += fileStat.size;
            } catch (err) {
              // File might not exist
              logger.debug(`File not found or already deleted: ${exp.filePath}`);
            }
          }
        }
      }

      // 3. Delete old reports (cascade handles related records)
      if (oldReports.length > 0) {
        const reportIds = oldReports.map((r) => r.id);
        const deleteResult = await prisma.report.deleteMany({
          where: { id: { in: reportIds } },
        });
        stats.reportsDeleted = deleteResult.count;
      }

      // 4. Clean old user activities
      const activityResult = await prisma.userActivity.deleteMany({
        where: { createdAt: { lt: activityCutoff } },
      });
      stats.activitiesDeleted = activityResult.count;

      // 5. Clean old analytics data
      const analyticsResult = await prisma.reportAnalytics.deleteMany({
        where: { date: { lt: analyticsCutoff } },
      });
      stats.analyticsDeleted = analyticsResult.count;

      // 6. Clean expired document exports (already expired status)
      const expiredExports = await prisma.documentExport.deleteMany({
        where: {
          status: 'EXPIRED',
          expiresAt: { lt: new Date() },
        },
      });
      stats.exportsDeleted = expiredExports.count;

      stats.duration = Date.now() - startTime;

      logger.info('Cleanup completed:', stats);

      // Log system activity
      const activityService = getActivityTrackingService();
      await activityService.logSystemActivity('DATA_CLEANUP', {
        metadata: stats as unknown as Record<string, unknown>,
      });

      return stats;
    } catch (error) {
      logger.error('Cleanup job failed:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  // Manual trigger for admin
  async triggerManualCleanup(): Promise<CleanupStats> {
    logger.info('Manual cleanup triggered');
    return this.runCleanup();
  }

  // Check if cleanup is currently running
  isCleanupRunning(): boolean {
    return this.isProcessing;
  }
}

// Singleton instance
let cleanupInstance: CleanupProcessor | null = null;

export function getCleanupProcessor(): CleanupProcessor {
  if (!cleanupInstance) {
    cleanupInstance = new CleanupProcessor();
  }
  return cleanupInstance;
}

export default CleanupProcessor;

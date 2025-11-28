// Schedule Service - Handles scheduled report generation
// Manages schedules linked to templates and triggers report creation

import { PrismaClient, Schedule, DeliveryMethod } from '@prisma/client';
import { CronExpressionParser } from 'cron-parser';
import { getUserTemplateService } from './user-template.service';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Input types
export interface CreateScheduleInput {
  userId: string;
  name: string;
  description?: string;
  templateId: string;
  cronExpression: string;
  timezone?: string;
  isActive?: boolean;
  deliveryMethod: DeliveryMethod;
  deliveryDestination?: string;
  targetCompanyName?: string;
  targetCompanyNames?: string[];
}

export interface UpdateScheduleInput {
  name?: string;
  description?: string;
  cronExpression?: string;
  timezone?: string;
  deliveryMethod?: DeliveryMethod;
  deliveryDestination?: string;
  targetCompanyName?: string;
  targetCompanyNames?: string[];
}

export interface ListSchedulesParams {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export class ScheduleService {
  // Validate cron expression
  private validateCronExpression(expression: string): boolean {
    try {
      CronExpressionParser.parse(expression);
      return true;
    } catch {
      return false;
    }
  }

  // Calculate next run time from cron expression
  private calculateNextRun(cronExpression: string, timezone: string): Date {
    try {
      const interval = CronExpressionParser.parse(cronExpression, {
        tz: timezone,
        currentDate: new Date(),
      });
      return interval.next().toDate();
    } catch (error) {
      logger.error('Failed to calculate next run', { cronExpression, timezone, error });
      throw new Error('Invalid cron expression');
    }
  }

  // Get multiple next run times
  getNextRuns(cronExpression: string, timezone: string, count: number = 5): Date[] {
    try {
      const interval = CronExpressionParser.parse(cronExpression, {
        tz: timezone,
        currentDate: new Date(),
      });

      const nextRuns: Date[] = [];
      for (let i = 0; i < count; i++) {
        nextRuns.push(interval.next().toDate());
      }
      return nextRuns;
    } catch (error) {
      logger.error('Failed to calculate next runs', { cronExpression, timezone, error });
      throw new Error('Invalid cron expression');
    }
  }

  // Create a new schedule
  async createSchedule(input: CreateScheduleInput): Promise<Schedule> {
    const {
      userId,
      name,
      description,
      templateId,
      cronExpression,
      timezone = 'America/New_York',
      isActive = true,
      deliveryMethod,
      deliveryDestination,
      targetCompanyName,
      targetCompanyNames,
    } = input;

    logger.info('Creating schedule', { userId, name, templateId });

    // Validate name
    if (!name || name.trim().length === 0) {
      throw new Error('Schedule name is required');
    }

    if (name.length > 200) {
      throw new Error('Schedule name must be 200 characters or less');
    }

    // Validate cron expression
    if (!this.validateCronExpression(cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    // Verify template exists and belongs to user
    const templateService = getUserTemplateService();
    const template = await templateService.getTemplate(templateId, userId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Validate delivery configuration
    if (deliveryMethod === 'WEBEX' && !deliveryDestination) {
      throw new Error('Delivery destination is required for Webex delivery');
    }

    // Calculate next run time
    const nextRunAt = isActive ? this.calculateNextRun(cronExpression, timezone) : null;

    // Create schedule
    const schedule = await prisma.schedule.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim(),
        templateId,
        cronExpression,
        timezone,
        isActive,
        deliveryMethod,
        deliveryDestination,
        targetCompanyName: targetCompanyName?.trim(),
        targetCompanyNames: targetCompanyNames || null,
        nextRunAt,
      },
      include: {
        template: true,
      },
    });

    logger.info('Schedule created', { scheduleId: schedule.id, userId });

    return schedule;
  }

  // Get schedules for a user
  async getSchedules(
    userId: string,
    params?: ListSchedulesParams
  ): Promise<{ schedules: Schedule[]; total: number }> {
    const { isActive, limit = 20, offset = 0 } = params || {};

    const where: any = { userId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          template: true,
        },
      }),
      prisma.schedule.count({ where }),
    ]);

    return { schedules, total };
  }

  // Get a single schedule
  async getSchedule(id: string, userId: string): Promise<Schedule | null> {
    const schedule = await prisma.schedule.findFirst({
      where: { id, userId },
      include: {
        template: true,
      },
    });

    return schedule;
  }

  // Update a schedule
  async updateSchedule(
    id: string,
    userId: string,
    input: UpdateScheduleInput
  ): Promise<Schedule> {
    // Verify ownership
    const existing = await prisma.schedule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error('Schedule not found');
    }

    const { name, description, cronExpression, timezone, deliveryMethod, deliveryDestination, targetCompanyName, targetCompanyNames } = input;

    // Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        throw new Error('Schedule name is required');
      }
      if (name.length > 200) {
        throw new Error('Schedule name must be 200 characters or less');
      }
    }

    // Validate cron expression if provided
    if (cronExpression !== undefined && !this.validateCronExpression(cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    // Validate delivery configuration
    const effectiveDeliveryMethod = deliveryMethod ?? existing.deliveryMethod;
    const effectiveDeliveryDestination = deliveryDestination !== undefined ? deliveryDestination : existing.deliveryDestination;
    if (effectiveDeliveryMethod === 'WEBEX' && !effectiveDeliveryDestination) {
      throw new Error('Delivery destination is required for Webex delivery');
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (cronExpression !== undefined) updateData.cronExpression = cronExpression;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (deliveryMethod !== undefined) updateData.deliveryMethod = deliveryMethod;
    if (deliveryDestination !== undefined) updateData.deliveryDestination = deliveryDestination;
    if (targetCompanyName !== undefined) updateData.targetCompanyName = targetCompanyName?.trim();
    if (targetCompanyNames !== undefined) updateData.targetCompanyNames = targetCompanyNames || null;

    // Recalculate next run if cron or timezone changed
    if ((cronExpression || timezone) && existing.isActive) {
      const effectiveCron = cronExpression ?? existing.cronExpression;
      const effectiveTimezone = timezone ?? existing.timezone;
      updateData.nextRunAt = this.calculateNextRun(effectiveCron, effectiveTimezone);
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: updateData,
      include: {
        template: true,
      },
    });

    logger.info('Schedule updated', { scheduleId: id, userId });

    return schedule;
  }

  // Delete a schedule
  async deleteSchedule(id: string, userId: string): Promise<void> {
    // Verify ownership
    const existing = await prisma.schedule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error('Schedule not found');
    }

    await prisma.schedule.delete({
      where: { id },
    });

    logger.info('Schedule deleted', { scheduleId: id, userId });
  }

  // Activate a schedule
  async activateSchedule(id: string, userId: string): Promise<Schedule> {
    const existing = await prisma.schedule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error('Schedule not found');
    }

    const nextRunAt = this.calculateNextRun(existing.cronExpression, existing.timezone);

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        isActive: true,
        nextRunAt,
      },
      include: {
        template: true,
      },
    });

    logger.info('Schedule activated', { scheduleId: id, userId });

    return schedule;
  }

  // Deactivate a schedule
  async deactivateSchedule(id: string, userId: string): Promise<Schedule> {
    const existing = await prisma.schedule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error('Schedule not found');
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        isActive: false,
        nextRunAt: null,
      },
      include: {
        template: true,
      },
    });

    logger.info('Schedule deactivated', { scheduleId: id, userId });

    return schedule;
  }

  // Get schedules that are due to run
  async getDueSchedules(): Promise<Schedule[]> {
    const now = new Date();

    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lte: now,
        },
      },
      include: {
        template: true,
        user: true,
      },
    });

    return schedules;
  }

  // Update schedule after execution
  async markScheduleExecuted(id: string): Promise<void> {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Calculate next run time
    const nextRunAt = this.calculateNextRun(schedule.cronExpression, schedule.timezone);

    await prisma.schedule.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
      },
    });

    logger.info('Schedule execution recorded', { scheduleId: id, nextRunAt });
  }

  // Trigger immediate execution (manual run)
  async triggerSchedule(id: string, userId: string): Promise<any> {
    const schedule = await prisma.schedule.findFirst({
      where: { id, userId },
      include: {
        template: true,
      },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (!schedule.template) {
      throw new Error('Schedule template not found');
    }

    // Apply the template to create a report
    const templateService = getUserTemplateService();

    // Generate title with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const title = `${schedule.name} - ${timestamp}`;

    // Get target company data from schedule
    let companyName = schedule.targetCompanyName;
    let companyNames = schedule.targetCompanyNames as string[] | undefined;

    // Validate that required company data is present
    if (schedule.template.workflowType !== 'NEWS_DIGEST') {
      // Account Intelligence and Competitive Intelligence need a company name
      if (!companyName) {
        throw new Error('Schedule is missing company name configuration');
      }
    } else {
      // News Digest needs company names array
      if (!companyNames || companyNames.length === 0) {
        throw new Error('Schedule is missing company names configuration');
      }
    }

    // Apply template to create report with company data
    const report = await templateService.applyTemplate(schedule.templateId, userId, {
      title,
      companyName,
      companyNames: companyNames || [],
    });

    logger.info('Schedule triggered manually', { scheduleId: id, reportId: report.id });

    return report;
  }
}

// Singleton instance
let serviceInstance: ScheduleService | null = null;

export function getScheduleService(): ScheduleService {
  if (!serviceInstance) {
    serviceInstance = new ScheduleService();
  }
  return serviceInstance;
}

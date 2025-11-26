// Activity Tracking Service - Logs user actions for audit and analytics
import { PrismaClient, Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Activity action types
export type ActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER'
  | 'PASSWORD_CHANGE'
  | 'REPORT_CREATE'
  | 'REPORT_VIEW'
  | 'REPORT_DELETE'
  | 'REPORT_EXPORT'
  | 'REPORT_DELIVER'
  | 'TEMPLATE_CREATE'
  | 'TEMPLATE_UPDATE'
  | 'TEMPLATE_DELETE'
  | 'TEMPLATE_APPLY'
  | 'SCHEDULE_CREATE'
  | 'SCHEDULE_UPDATE'
  | 'SCHEDULE_DELETE'
  | 'SCHEDULE_ACTIVATE'
  | 'SCHEDULE_DEACTIVATE'
  | 'SCHEDULE_TRIGGER'
  | 'SETTINGS_UPDATE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_ACTIVATE'
  | 'USER_DEACTIVATE'
  | 'USER_PASSWORD_RESET'
  | 'DATA_CLEANUP';

// Activity details interface
export interface ActivityDetails {
  resourceId?: string;
  resourceType?: string;
  resourceName?: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

export class ActivityTrackingService {
  // Log a user activity
  async logActivity(
    userId: string,
    action: ActivityAction,
    details?: ActivityDetails,
    request?: FastifyRequest
  ): Promise<void> {
    try {
      await prisma.userActivity.create({
        data: {
          userId,
          action,
          details: details ? (details as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: request?.ip || null,
          userAgent: request?.headers['user-agent'] || null,
        },
      });

      logger.debug('Activity logged', { userId, action, resourceId: details?.resourceId });
    } catch (error) {
      // Don't throw errors for activity logging - it should not break main flow
      logger.error('Failed to log activity:', { userId, action, error });
    }
  }

  // Batch log activities (for bulk operations)
  async logBatch(
    activities: Array<{
      userId: string;
      action: ActivityAction;
      details?: ActivityDetails;
    }>
  ): Promise<void> {
    try {
      await prisma.userActivity.createMany({
        data: activities.map((a) => ({
          userId: a.userId,
          action: a.action,
          details: a.details ? (a.details as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: null,
          userAgent: null,
        })),
      });

      logger.debug('Batch activities logged', { count: activities.length });
    } catch (error) {
      logger.error('Failed to log batch activities:', error);
    }
  }

  // Log system activity (no user associated)
  async logSystemActivity(
    action: ActivityAction,
    details?: ActivityDetails
  ): Promise<void> {
    try {
      await prisma.userActivity.create({
        data: {
          userId: 'SYSTEM',
          action,
          details: details ? (details as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: null,
          userAgent: null,
        },
      });

      logger.debug('System activity logged', { action });
    } catch (error) {
      logger.error('Failed to log system activity:', error);
    }
  }

  // Get activities for a specific user
  async getUserActivities(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    activities: Array<{
      id: string;
      action: string;
      details: Record<string, unknown> | null;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const { limit = 20, offset = 0 } = options || {};

    const [activities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          action: true,
          details: true,
          createdAt: true,
        },
      }),
      prisma.userActivity.count({ where: { userId } }),
    ]);

    return {
      activities: activities.map((a) => ({
        id: a.id,
        action: a.action,
        details: a.details as Record<string, unknown> | null,
        createdAt: a.createdAt,
      })),
      total,
    };
  }

  // Get activity counts by action type
  async getActivityCounts(
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ action: string; count: number }>> {
    const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const counts = await prisma.userActivity.groupBy({
      by: ['action'],
      _count: { id: true },
      where,
    });

    return counts.map((c) => ({
      action: c.action,
      count: c._count.id,
    }));
  }
}

// Singleton instance
let activityServiceInstance: ActivityTrackingService | null = null;

export function getActivityTrackingService(): ActivityTrackingService {
  if (!activityServiceInstance) {
    activityServiceInstance = new ActivityTrackingService();
  }
  return activityServiceInstance;
}

export default ActivityTrackingService;

// Analytics Service - Handles analytics data aggregation and queries
import { PrismaClient, WorkflowType } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Types
export interface DashboardSummary {
  totalReports: number;
  totalUsers: number;
  activeUsers: number;
  reportsThisWeek: number;
  reportsThisMonth: number;
  activeSchedules: number;
  totalTemplates: number;
  successRate: number;
  reportsChange: number;
  schedulesChange: number;
  templatesChange: number;
}

export interface ReportTrend {
  date: string;
  workflowType: WorkflowType;
  total: number;
  completed: number;
  failed: number;
  avgDuration: number | null;
}

export interface WorkflowDistribution {
  workflowType: WorkflowType;
  count: number;
  percentage: number;
}

export interface UserActivitySummary {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  totalReports: number;
  lastActive: Date | null;
}

export interface RecentActivityItem {
  id: string;
  userId: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  userEmail?: string;
}

export class AnalyticsService {
  // Get dashboard summary statistics
  async getDashboardSummary(): Promise<DashboardSummary> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);
    const prevMonthStart = new Date(now);
    prevMonthStart.setDate(prevMonthStart.getDate() - 60);

    try {
      const [
        totalReports,
        totalUsers,
        activeUsers,
        reportsThisWeek,
        reportsThisMonth,
        reportsPrevMonth,
        completedReports,
        failedReports,
        activeSchedules,
        activeSchedulesPrev,
        totalTemplates,
        templatesPrev,
      ] = await prisma.$transaction([
        // Total reports
        prisma.report.count(),
        // Total users
        prisma.user.count(),
        // Active users (logged in within 30 days)
        prisma.user.count({
          where: { lastLoginAt: { gte: monthStart } },
        }),
        // Reports this week
        prisma.report.count({
          where: { createdAt: { gte: weekStart } },
        }),
        // Reports this month
        prisma.report.count({
          where: { createdAt: { gte: monthStart } },
        }),
        // Reports previous month (for comparison)
        prisma.report.count({
          where: {
            createdAt: {
              gte: prevMonthStart,
              lt: monthStart,
            },
          },
        }),
        // Completed reports
        prisma.report.count({
          where: { status: 'COMPLETED' },
        }),
        // Failed reports
        prisma.report.count({
          where: { status: 'FAILED' },
        }),
        // Active schedules
        prisma.schedule.count({
          where: { isActive: true },
        }),
        // Active schedules previous month
        prisma.schedule.count({
          where: {
            isActive: true,
            createdAt: { lt: monthStart },
          },
        }),
        // Total templates
        prisma.template.count(),
        // Templates previous month
        prisma.template.count({
          where: { createdAt: { lt: monthStart } },
        }),
      ]);

      // Calculate success rate
      const totalProcessed = completedReports + failedReports;
      const successRate = totalProcessed > 0 ? Math.round((completedReports / totalProcessed) * 100) : 100;

      // Calculate percentage changes
      const reportsChange = reportsPrevMonth > 0
        ? Math.round(((reportsThisMonth - reportsPrevMonth) / reportsPrevMonth) * 100)
        : reportsThisMonth > 0 ? 100 : 0;

      const schedulesChange = activeSchedulesPrev > 0
        ? Math.round(((activeSchedules - activeSchedulesPrev) / activeSchedulesPrev) * 100)
        : activeSchedules > 0 ? 100 : 0;

      const templatesChange = templatesPrev > 0
        ? Math.round(((totalTemplates - templatesPrev) / templatesPrev) * 100)
        : totalTemplates > 0 ? 100 : 0;

      return {
        totalReports,
        totalUsers,
        activeUsers,
        reportsThisWeek,
        reportsThisMonth,
        activeSchedules,
        totalTemplates,
        successRate,
        reportsChange,
        schedulesChange,
        templatesChange,
      };
    } catch (error) {
      logger.error('Failed to get dashboard summary:', error);
      throw error;
    }
  }

  // Get report trends over time
  async getReportTrends(
    startDate: Date,
    endDate: Date,
    _groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ReportTrend[]> {
    try {
      // Query from ReportAnalytics table
      const analytics = await prisma.reportAnalytics.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      });

      // If no data in analytics table, fall back to Report table
      if (analytics.length === 0) {
        const reports = await prisma.report.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            workflowType: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
        });

        // Group by date
        const grouped = new Map<string, {
          total: number;
          completed: number;
          failed: number;
          durations: number[];
          workflowType: WorkflowType;
        }>();

        reports.forEach((report) => {
          const dateKey = report.createdAt.toISOString().split('T')[0];
          const key = `${dateKey}-${report.workflowType}`;

          if (!grouped.has(key)) {
            grouped.set(key, {
              total: 0,
              completed: 0,
              failed: 0,
              durations: [],
              workflowType: report.workflowType,
            });
          }

          const entry = grouped.get(key)!;
          entry.total++;

          if (report.status === 'COMPLETED') {
            entry.completed++;
            if (report.completedAt) {
              const duration = report.completedAt.getTime() - report.createdAt.getTime();
              entry.durations.push(duration);
            }
          } else if (report.status === 'FAILED') {
            entry.failed++;
          }
        });

        return Array.from(grouped.entries()).map(([key, data]) => {
          const [date] = key.split('-');
          const avgDuration = data.durations.length > 0
            ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
            : null;

          return {
            date,
            workflowType: data.workflowType,
            total: data.total,
            completed: data.completed,
            failed: data.failed,
            avgDuration,
          };
        });
      }

      return analytics.map((a) => ({
        date: a.date.toISOString().split('T')[0],
        workflowType: a.workflowType,
        total: a.totalGenerated,
        completed: a.totalGenerated - a.totalFailed,
        failed: a.totalFailed,
        avgDuration: a.avgDuration,
      }));
    } catch (error) {
      logger.error('Failed to get report trends:', error);
      throw error;
    }
  }

  // Get workflow type distribution
  async getWorkflowDistribution(startDate?: Date, endDate?: Date): Promise<WorkflowDistribution[]> {
    try {
      const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const distribution = await prisma.report.groupBy({
        by: ['workflowType'],
        _count: { id: true },
        where,
      });

      const total = distribution.reduce((sum, d) => sum + d._count.id, 0);

      return distribution.map((d) => ({
        workflowType: d.workflowType,
        count: d._count.id,
        percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0,
      }));
    } catch (error) {
      logger.error('Failed to get workflow distribution:', error);
      throw error;
    }
  }

  // Get top users by activity (admin only)
  async getTopUsers(limit: number = 10, period?: 'week' | 'month' | 'all'): Promise<UserActivitySummary[]> {
    try {
      let dateFilter: Date | undefined;
      if (period === 'week') {
        dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (period === 'month') {
        dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - 30);
      }

      const users = await prisma.user.findMany({
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          lastLoginAt: true,
          _count: {
            select: {
              reports: dateFilter
                ? { where: { createdAt: { gte: dateFilter } } }
                : true,
            },
          },
        },
        orderBy: {
          reports: { _count: 'desc' },
        },
      });

      return users.map((user) => ({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        totalReports: user._count.reports,
        lastActive: user.lastLoginAt,
      }));
    } catch (error) {
      logger.error('Failed to get top users:', error);
      throw error;
    }
  }

  // Get recent activity feed
  async getRecentActivity(
    limit: number = 20,
    userId?: string
  ): Promise<RecentActivityItem[]> {
    try {
      const where: { userId?: string } = {};
      if (userId) where.userId = userId;

      const activities = await prisma.userActivity.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      // Get user emails for display
      const userIds = [...new Set(activities.map((a) => a.userId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u.email]));

      return activities.map((activity) => ({
        id: activity.id,
        userId: activity.userId,
        action: activity.action,
        details: activity.details as Record<string, unknown> | null,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        createdAt: activity.createdAt,
        userEmail: userMap.get(activity.userId),
      }));
    } catch (error) {
      logger.error('Failed to get recent activity:', error);
      throw error;
    }
  }

  // Get user activity log with pagination (admin only)
  async getUserActivityLog(filters: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ activities: RecentActivityItem[]; total: number }> {
    try {
      const { userId, action, startDate, endDate, limit = 20, offset = 0 } = filters;

      const where: {
        userId?: string;
        action?: string;
        createdAt?: { gte?: Date; lte?: Date };
      } = {};

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [activities, total] = await Promise.all([
        prisma.userActivity.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.userActivity.count({ where }),
      ]);

      // Get user emails
      const userIds = [...new Set(activities.map((a) => a.userId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u.email]));

      return {
        activities: activities.map((activity) => ({
          id: activity.id,
          userId: activity.userId,
          action: activity.action,
          details: activity.details as Record<string, unknown> | null,
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
          createdAt: activity.createdAt,
          userEmail: userMap.get(activity.userId),
        })),
        total,
      };
    } catch (error) {
      logger.error('Failed to get user activity log:', error);
      throw error;
    }
  }
}

// Singleton instance
let analyticsServiceInstance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}

export default AnalyticsService;

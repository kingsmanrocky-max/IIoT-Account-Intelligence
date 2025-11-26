// Analytics Controller - API endpoint handlers for analytics
import { FastifyRequest, FastifyReply } from 'fastify';
import { getAnalyticsService } from '../services/analytics.service';
import logger from '../utils/logger';

interface TrendsQuery {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

interface DistributionQuery {
  startDate?: string;
  endDate?: string;
}

interface ActivityQuery {
  limit?: number;
  userId?: string;
}

interface ActivityLogQuery {
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface TopUsersQuery {
  limit?: number;
  period?: 'week' | 'month' | 'all';
}

export class AnalyticsController {
  private analyticsService = getAnalyticsService();

  // GET /api/analytics/dashboard
  async getDashboard(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const summary = await this.analyticsService.getDashboardSummary();
      return reply.send({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Failed to get dashboard:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYTICS_ERROR', message: 'Failed to retrieve dashboard data' },
      });
    }
  }

  // GET /api/analytics/trends
  async getTrends(
    request: FastifyRequest<{ Querystring: TrendsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { startDate, endDate, groupBy = 'day' } = request.query;

      // Default to last 30 days if not specified
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Invalid date format' },
        });
      }

      const trends = await this.analyticsService.getReportTrends(start, end, groupBy);
      return reply.send({
        success: true,
        data: trends,
      });
    } catch (error) {
      logger.error('Failed to get trends:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYTICS_ERROR', message: 'Failed to retrieve trend data' },
      });
    }
  }

  // GET /api/analytics/distribution
  async getDistribution(
    request: FastifyRequest<{ Querystring: DistributionQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { startDate, endDate } = request.query;

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      // Validate dates if provided
      if ((startDate && isNaN(start!.getTime())) || (endDate && isNaN(end!.getTime()))) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Invalid date format' },
        });
      }

      const distribution = await this.analyticsService.getWorkflowDistribution(start, end);
      return reply.send({
        success: true,
        data: distribution,
      });
    } catch (error) {
      logger.error('Failed to get distribution:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYTICS_ERROR', message: 'Failed to retrieve distribution data' },
      });
    }
  }

  // GET /api/analytics/activity
  async getRecentActivity(
    request: FastifyRequest<{ Querystring: ActivityQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { limit = 20, userId } = request.query;

      // Validate limit
      const validLimit = Math.min(Math.max(1, limit), 100);

      const activities = await this.analyticsService.getRecentActivity(validLimit, userId);
      return reply.send({
        success: true,
        data: activities,
      });
    } catch (error) {
      logger.error('Failed to get recent activity:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYTICS_ERROR', message: 'Failed to retrieve activity data' },
      });
    }
  }

  // GET /api/analytics/top-users (Admin only)
  async getTopUsers(
    request: FastifyRequest<{ Querystring: TopUsersQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { limit = 10, period } = request.query;

      // Validate limit
      const validLimit = Math.min(Math.max(1, limit), 50);

      const users = await this.analyticsService.getTopUsers(validLimit, period);
      return reply.send({
        success: true,
        data: users,
      });
    } catch (error) {
      logger.error('Failed to get top users:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYTICS_ERROR', message: 'Failed to retrieve top users data' },
      });
    }
  }

  // GET /api/analytics/activity-log (Admin only)
  async getActivityLog(
    request: FastifyRequest<{ Querystring: ActivityLogQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { userId, action, startDate, endDate, limit = 20, offset = 0 } = request.query;

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      // Validate dates if provided
      if ((startDate && isNaN(start!.getTime())) || (endDate && isNaN(end!.getTime()))) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Invalid date format' },
        });
      }

      // Validate pagination
      const validLimit = Math.min(Math.max(1, limit), 100);
      const validOffset = Math.max(0, offset);

      const result = await this.analyticsService.getUserActivityLog({
        userId,
        action,
        startDate: start,
        endDate: end,
        limit: validLimit,
        offset: validOffset,
      });

      return reply.send({
        success: true,
        data: result.activities,
        pagination: {
          total: result.total,
          limit: validLimit,
          offset: validOffset,
        },
      });
    } catch (error) {
      logger.error('Failed to get activity log:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYTICS_ERROR', message: 'Failed to retrieve activity log' },
      });
    }
  }
}

// Singleton instance
let controllerInstance: AnalyticsController | null = null;

export function getAnalyticsController(): AnalyticsController {
  if (!controllerInstance) {
    controllerInstance = new AnalyticsController();
  }
  return controllerInstance;
}

export default AnalyticsController;

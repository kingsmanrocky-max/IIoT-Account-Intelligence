// Analytics Routes - API endpoints for analytics data
import { FastifyInstance } from 'fastify';
import { getAnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

export async function analyticsRoutes(fastify: FastifyInstance) {
  const analyticsController = getAnalyticsController();

  // All analytics routes require authentication
  fastify.addHook('preHandler', authMiddleware);

  // Dashboard summary - available to all authenticated users
  fastify.get('/dashboard', {
    schema: {
      description: 'Get dashboard summary statistics',
      tags: ['Analytics'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalReports: { type: 'integer' },
                totalUsers: { type: 'integer' },
                activeUsers: { type: 'integer' },
                reportsThisWeek: { type: 'integer' },
                reportsThisMonth: { type: 'integer' },
                activeSchedules: { type: 'integer' },
                totalTemplates: { type: 'integer' },
                successRate: { type: 'integer' },
                reportsChange: { type: 'integer' },
                schedulesChange: { type: 'integer' },
                templatesChange: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  }, analyticsController.getDashboard.bind(analyticsController));

  // Report trends - available to all authenticated users
  fastify.get('/trends', {
    schema: {
      description: 'Get report generation trends over time',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          groupBy: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  workflowType: { type: 'string' },
                  total: { type: 'integer' },
                  completed: { type: 'integer' },
                  failed: { type: 'integer' },
                  avgDuration: { type: ['integer', 'null'] },
                },
              },
            },
          },
        },
      },
    },
  }, analyticsController.getTrends.bind(analyticsController));

  // Workflow distribution - available to all authenticated users
  fastify.get('/distribution', {
    schema: {
      description: 'Get workflow type distribution',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  workflowType: { type: 'string' },
                  count: { type: 'integer' },
                  percentage: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  }, analyticsController.getDistribution.bind(analyticsController));

  // Recent activity - available to all authenticated users
  fastify.get('/activity', {
    schema: {
      description: 'Get recent platform activity',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          userId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  action: { type: 'string' },
                  details: { type: 'object' },
                  ipAddress: { type: ['string', 'null'] },
                  userAgent: { type: ['string', 'null'] },
                  createdAt: { type: 'string' },
                  userEmail: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, analyticsController.getRecentActivity.bind(analyticsController));

  // Admin-only analytics endpoints
  fastify.register(async (adminFastify) => {
    adminFastify.addHook('preHandler', adminMiddleware);

    // Top users - admin only
    adminFastify.get('/top-users', {
      schema: {
        description: 'Get top users by activity (admin only)',
        tags: ['Analytics', 'Admin'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            period: { type: 'string', enum: ['week', 'month', 'all'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                    email: { type: 'string' },
                    firstName: { type: ['string', 'null'] },
                    lastName: { type: ['string', 'null'] },
                    totalReports: { type: 'integer' },
                    lastActive: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
        },
      },
    }, analyticsController.getTopUsers.bind(analyticsController));

    // Activity log - admin only
    adminFastify.get('/activity-log', {
      schema: {
        description: 'Get full activity log with pagination (admin only)',
        tags: ['Analytics', 'Admin'],
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            action: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  limit: { type: 'integer' },
                  offset: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    }, analyticsController.getActivityLog.bind(analyticsController));
  });
}

export default analyticsRoutes;

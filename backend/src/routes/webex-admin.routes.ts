// Webex Admin Routes - API endpoints for Webex bot interaction data
import { FastifyInstance } from 'fastify';
import { getWebexAdminController } from '../controllers/webex-admin.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

export async function webexAdminRoutes(fastify: FastifyInstance) {
  const webexAdminController = getWebexAdminController();

  // All Webex admin routes require authentication and admin role
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', adminMiddleware);

  // List Webex bot interactions with pagination and filters
  fastify.get('/interactions', {
    schema: {
      description: 'Get paginated list of Webex bot interactions (admin only)',
      tags: ['Admin', 'Webex'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          email: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          responseType: { type: 'string' },
          success: { type: 'string', enum: ['true', 'false'] },
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
                  userEmail: { type: 'string' },
                  personId: { type: ['string', 'null'] },
                  roomId: { type: ['string', 'null'] },
                  messageText: { type: 'string' },
                  messageId: { type: ['string', 'null'] },
                  workflowType: { type: ['string', 'null'] },
                  targetCompany: { type: ['string', 'null'] },
                  additionalData: { type: ['object', 'null'] },
                  responseType: { type: 'string' },
                  responseText: { type: ['string', 'null'] },
                  reportId: { type: ['string', 'null'] },
                  success: { type: 'boolean' },
                  errorMessage: { type: ['string', 'null'] },
                  createdAt: { type: 'string' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  }, webexAdminController.listInteractions.bind(webexAdminController));

  // Get aggregate statistics for Webex bot interactions
  fastify.get('/stats', {
    schema: {
      description: 'Get aggregate statistics for Webex bot interactions (admin only)',
      tags: ['Admin', 'Webex'],
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
              type: 'object',
              properties: {
                totalInteractions: { type: 'integer' },
                successCount: { type: 'integer' },
                failureCount: { type: 'integer' },
                successRate: { type: 'number' },
                byResponseType: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      responseType: { type: 'string' },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, webexAdminController.getStats.bind(webexAdminController));
}

export default webexAdminRoutes;

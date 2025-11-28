// Webex Admin Controller - API endpoint handlers for Webex bot interaction data
import { FastifyRequest, FastifyReply } from 'fastify';
import { getWebexAdminService } from '../services/webex-admin.service';
import logger from '../utils/logger';

interface InteractionsQuery {
  page?: number;
  limit?: number;
  email?: string;
  startDate?: string;
  endDate?: string;
  responseType?: string;
  success?: string; // String because query params are strings
}

interface StatsQuery {
  startDate?: string;
  endDate?: string;
}

export class WebexAdminController {
  private webexAdminService = getWebexAdminService();

  // GET /api/admin/webex/interactions
  async listInteractions(
    request: FastifyRequest<{ Querystring: InteractionsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { page, limit, email, startDate, endDate, responseType, success } = request.query;

      // Parse and validate pagination
      const validPage = page ? Math.max(1, page) : 1;
      const validLimit = limit ? Math.min(Math.max(1, limit), 100) : 20;

      // Parse boolean success flag
      let successFilter: boolean | undefined;
      if (success === 'true') successFilter = true;
      else if (success === 'false') successFilter = false;

      // Validate dates if provided
      if (startDate && isNaN(new Date(startDate).getTime())) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Invalid startDate format' },
        });
      }

      if (endDate && isNaN(new Date(endDate).getTime())) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Invalid endDate format' },
        });
      }

      const result = await this.webexAdminService.listInteractions({
        page: validPage,
        limit: validLimit,
        email,
        startDate,
        endDate,
        responseType,
        success: successFilter,
      });

      return reply.send({
        success: true,
        data: result.interactions,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Failed to list Webex interactions:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'WEBEX_ADMIN_ERROR', message: 'Failed to retrieve Webex interactions' },
      });
    }
  }

  // GET /api/admin/webex/stats
  async getStats(
    request: FastifyRequest<{ Querystring: StatsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { startDate, endDate } = request.query;

      // Validate dates if provided
      if (startDate && isNaN(new Date(startDate).getTime())) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Invalid startDate format' },
        });
      }

      if (endDate && isNaN(new Date(endDate).getTime())) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Invalid endDate format' },
        });
      }

      const stats = await this.webexAdminService.getStats({
        startDate,
        endDate,
      });

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get Webex stats:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'WEBEX_ADMIN_ERROR', message: 'Failed to retrieve Webex statistics' },
      });
    }
  }
}

// Singleton instance
let controllerInstance: WebexAdminController | null = null;

export function getWebexAdminController(): WebexAdminController {
  if (!controllerInstance) {
    controllerInstance = new WebexAdminController();
  }
  return controllerInstance;
}

export default WebexAdminController;

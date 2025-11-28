// Webex Admin Service - Handles querying Webex bot interaction data
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Types
export interface WebexInteractionListParams {
  page?: number;
  limit?: number;
  email?: string;
  startDate?: string;
  endDate?: string;
  responseType?: string;
  success?: boolean;
}

export interface WebexInteractionListResult {
  interactions: WebexInteraction[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface WebexInteraction {
  id: string;
  userEmail: string;
  personId: string | null;
  roomId: string | null;
  messageText: string;
  messageId: string | null;
  workflowType: string | null;
  targetCompany: string | null;
  additionalData: Record<string, unknown> | null;
  responseType: string;
  responseText: string | null;
  reportId: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: Date;
}

export interface WebexStatsParams {
  startDate?: string;
  endDate?: string;
}

export interface WebexStats {
  totalInteractions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  byResponseType: Array<{ responseType: string; count: number }>;
}

export class WebexAdminService {
  // Get paginated list of interactions with filters
  async listInteractions(params: WebexInteractionListParams): Promise<WebexInteractionListResult> {
    const { page = 1, limit = 20, email, startDate, endDate, responseType, success } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Apply filters
    if (email) {
      where.userEmail = { contains: email, mode: 'insensitive' };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (responseType) {
      where.responseType = responseType;
    }

    if (success !== undefined) {
      where.success = success;
    }

    try {
      // Fetch interactions and total count
      const [interactions, total] = await Promise.all([
        prisma.webexInteraction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.webexInteraction.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.debug(`Listed ${interactions.length} Webex interactions`, {
        page,
        limit,
        total,
        filters: { email, startDate, endDate, responseType, success },
      });

      return {
        interactions: interactions as WebexInteraction[],
        total,
        totalPages,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error listing Webex interactions:', error);
      throw new Error('Failed to fetch Webex interactions');
    }
  }

  // Get aggregate statistics for Webex bot interactions
  async getStats(params: WebexStatsParams = {}): Promise<WebexStats> {
    const { startDate, endDate } = params;

    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    try {
      // Get total count and success/failure counts
      const [totalInteractions, successCount, failureCount, byResponseType] = await Promise.all([
        prisma.webexInteraction.count({ where }),
        prisma.webexInteraction.count({ where: { ...where, success: true } }),
        prisma.webexInteraction.count({ where: { ...where, success: false } }),
        prisma.webexInteraction.groupBy({
          by: ['responseType'],
          where,
          _count: {
            responseType: true,
          },
        }),
      ]);

      const successRate = totalInteractions > 0 ? (successCount / totalInteractions) * 100 : 0;

      logger.debug('Fetched Webex interaction stats', {
        totalInteractions,
        successCount,
        failureCount,
        successRate,
      });

      return {
        totalInteractions,
        successCount,
        failureCount,
        successRate: Math.round(successRate * 100) / 100,
        byResponseType: byResponseType.map((item) => ({
          responseType: item.responseType,
          count: item._count.responseType,
        })),
      };
    } catch (error) {
      logger.error('Error fetching Webex interaction stats:', error);
      throw new Error('Failed to fetch Webex interaction stats');
    }
  }
}

// Singleton instance
let webexAdminServiceInstance: WebexAdminService | null = null;

export function getWebexAdminService(): WebexAdminService {
  if (!webexAdminServiceInstance) {
    webexAdminServiceInstance = new WebexAdminService();
  }
  return webexAdminServiceInstance;
}

export default WebexAdminService;

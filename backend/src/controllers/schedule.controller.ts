// Schedule Controller - Handles HTTP requests for schedules

import { FastifyRequest, FastifyReply } from 'fastify';
import { DeliveryMethod } from '@prisma/client';
import { getScheduleService } from '../services/schedule.service';
import logger from '../utils/logger';

interface CreateScheduleBody {
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

interface UpdateScheduleBody {
  name?: string;
  description?: string;
  cronExpression?: string;
  timezone?: string;
  deliveryMethod?: DeliveryMethod;
  deliveryDestination?: string;
  targetCompanyName?: string;
  targetCompanyNames?: string[];
}

interface ListSchedulesQuery {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export class ScheduleController {
  private scheduleService = getScheduleService();

  // Create a new schedule
  async createSchedule(
    request: FastifyRequest<{ Body: CreateScheduleBody }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const {
        name,
        description,
        templateId,
        cronExpression,
        timezone,
        isActive,
        deliveryMethod,
        deliveryDestination,
        targetCompanyName,
        targetCompanyNames,
      } = request.body;

      // Validate delivery method
      if (!['DOWNLOAD', 'WEBEX'].includes(deliveryMethod)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_DELIVERY_METHOD',
            message: 'Invalid delivery method. Must be DOWNLOAD or WEBEX',
          },
        });
      }

      const schedule = await this.scheduleService.createSchedule({
        userId,
        name,
        description,
        templateId,
        cronExpression,
        timezone,
        isActive,
        deliveryMethod,
        deliveryDestination,
        targetCompanyName,
        targetCompanyNames,
      });

      logger.info(`Schedule created by user ${userId}: ${schedule.id}`);

      return reply.status(201).send({
        success: true,
        data: schedule,
        message: 'Schedule created successfully',
      });
    } catch (error) {
      logger.error('Create schedule error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CREATE_SCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create schedule',
        },
      });
    }
  }

  // List schedules for the user
  async listSchedules(
    request: FastifyRequest<{ Querystring: ListSchedulesQuery }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { isActive, limit, offset } = request.query;

      const { schedules, total } = await this.scheduleService.getSchedules(userId, {
        isActive: isActive !== undefined ? isActive === true || isActive === 'true' as any : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      });

      return reply.send({
        success: true,
        data: schedules,
        pagination: {
          total,
          limit: limit || 20,
          offset: offset || 0,
        },
      });
    } catch (error) {
      logger.error('List schedules error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'LIST_SCHEDULES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list schedules',
        },
      });
    }
  }

  // Get a single schedule
  async getSchedule(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      const schedule = await this.scheduleService.getSchedule(id, userId);

      if (!schedule) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SCHEDULE_NOT_FOUND',
            message: 'Schedule not found',
          },
        });
      }

      return reply.send({
        success: true,
        data: schedule,
      });
    } catch (error) {
      logger.error('Get schedule error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'GET_SCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get schedule',
        },
      });
    }
  }

  // Update a schedule
  async updateSchedule(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateScheduleBody }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;
      const { name, description, cronExpression, timezone, deliveryMethod, deliveryDestination, targetCompanyName, targetCompanyNames } = request.body;

      // Validate delivery method if provided
      if (deliveryMethod && !['DOWNLOAD', 'WEBEX'].includes(deliveryMethod)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_DELIVERY_METHOD',
            message: 'Invalid delivery method. Must be DOWNLOAD or WEBEX',
          },
        });
      }

      const schedule = await this.scheduleService.updateSchedule(id, userId, {
        name,
        description,
        cronExpression,
        timezone,
        deliveryMethod,
        deliveryDestination,
        targetCompanyName,
        targetCompanyNames,
      });

      logger.info(`Schedule updated by user ${userId}: ${id}`);

      return reply.send({
        success: true,
        data: schedule,
        message: 'Schedule updated successfully',
      });
    } catch (error) {
      logger.error('Update schedule error:', error);

      if (error instanceof Error && error.message === 'Schedule not found') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SCHEDULE_NOT_FOUND',
            message: 'Schedule not found',
          },
        });
      }

      return reply.status(400).send({
        success: false,
        error: {
          code: 'UPDATE_SCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update schedule',
        },
      });
    }
  }

  // Delete a schedule
  async deleteSchedule(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      await this.scheduleService.deleteSchedule(id, userId);

      logger.info(`Schedule deleted by user ${userId}: ${id}`);

      return reply.send({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      logger.error('Delete schedule error:', error);

      if (error instanceof Error && error.message === 'Schedule not found') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SCHEDULE_NOT_FOUND',
            message: 'Schedule not found',
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: {
          code: 'DELETE_SCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete schedule',
        },
      });
    }
  }

  // Activate a schedule
  async activateSchedule(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      const schedule = await this.scheduleService.activateSchedule(id, userId);

      logger.info(`Schedule activated by user ${userId}: ${id}`);

      return reply.send({
        success: true,
        data: schedule,
        message: 'Schedule activated successfully',
      });
    } catch (error) {
      logger.error('Activate schedule error:', error);

      if (error instanceof Error && error.message === 'Schedule not found') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SCHEDULE_NOT_FOUND',
            message: 'Schedule not found',
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: {
          code: 'ACTIVATE_SCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to activate schedule',
        },
      });
    }
  }

  // Deactivate a schedule
  async deactivateSchedule(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      const schedule = await this.scheduleService.deactivateSchedule(id, userId);

      logger.info(`Schedule deactivated by user ${userId}: ${id}`);

      return reply.send({
        success: true,
        data: schedule,
        message: 'Schedule deactivated successfully',
      });
    } catch (error) {
      logger.error('Deactivate schedule error:', error);

      if (error instanceof Error && error.message === 'Schedule not found') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SCHEDULE_NOT_FOUND',
            message: 'Schedule not found',
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: {
          code: 'DEACTIVATE_SCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to deactivate schedule',
        },
      });
    }
  }

  // Trigger immediate execution
  async triggerSchedule(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      const report = await this.scheduleService.triggerSchedule(id, userId);

      logger.info(`Schedule triggered by user ${userId}: ${id}`);

      return reply.send({
        success: true,
        data: report,
        message: 'Schedule triggered successfully',
      });
    } catch (error) {
      logger.error('Trigger schedule error:', error);

      if (error instanceof Error && error.message === 'Schedule not found') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SCHEDULE_NOT_FOUND',
            message: 'Schedule not found',
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: {
          code: 'TRIGGER_SCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to trigger schedule',
        },
      });
    }
  }

  // Get next run times
  async getNextRuns(
    request: FastifyRequest<{ Params: { id: string }; Querystring: { count?: number } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;
      const { count = 5 } = request.query;

      const schedule = await this.scheduleService.getSchedule(id, userId);

      if (!schedule) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SCHEDULE_NOT_FOUND',
            message: 'Schedule not found',
          },
        });
      }

      const nextRuns = this.scheduleService.getNextRuns(
        schedule.cronExpression,
        schedule.timezone,
        Math.min(parseInt(String(count), 10), 20)
      );

      return reply.send({
        success: true,
        data: nextRuns.map((d) => d.toISOString()),
      });
    } catch (error) {
      logger.error('Get next runs error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'GET_NEXT_RUNS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get next runs',
        },
      });
    }
  }
}

// Singleton instance
let controllerInstance: ScheduleController | null = null;

export function getScheduleController(): ScheduleController {
  if (!controllerInstance) {
    controllerInstance = new ScheduleController();
  }
  return controllerInstance;
}

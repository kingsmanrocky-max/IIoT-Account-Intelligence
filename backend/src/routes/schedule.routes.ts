// Schedule Routes - API endpoints for schedule management

import { FastifyInstance } from 'fastify';
import { getScheduleController } from '../controllers/schedule.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export async function scheduleRoutes(app: FastifyInstance) {
  const scheduleController = getScheduleController();

  // All routes require authentication
  app.addHook('preHandler', authMiddleware);

  // Create a new schedule
  app.post('/', {
    schema: {
      description: 'Create a new schedule',
      tags: ['Schedules'],
      body: {
        type: 'object',
        required: ['name', 'templateId', 'cronExpression', 'deliveryMethod'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 500 },
          templateId: { type: 'string', format: 'uuid' },
          cronExpression: { type: 'string', minLength: 9 },
          timezone: { type: 'string', default: 'America/New_York' },
          isActive: { type: 'boolean', default: true },
          deliveryMethod: { type: 'string', enum: ['DOWNLOAD', 'WEBEX'] },
          deliveryDestination: { type: 'string' },
          targetCompanyName: { type: 'string' },
          targetCompanyNames: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, scheduleController.createSchedule.bind(scheduleController));

  // List schedules
  app.get('/', {
    schema: {
      description: 'List user schedules',
      tags: ['Schedules'],
      querystring: {
        type: 'object',
        properties: {
          isActive: { type: 'boolean' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
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
  }, scheduleController.listSchedules.bind(scheduleController));

  // Get a single schedule
  app.get('/:id', {
    schema: {
      description: 'Get a schedule by ID',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, scheduleController.getSchedule.bind(scheduleController));

  // Update a schedule
  app.put('/:id', {
    schema: {
      description: 'Update a schedule',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 500 },
          cronExpression: { type: 'string', minLength: 9 },
          timezone: { type: 'string' },
          deliveryMethod: { type: 'string', enum: ['DOWNLOAD', 'WEBEX'] },
          deliveryDestination: { type: 'string' },
          targetCompanyName: { type: 'string' },
          targetCompanyNames: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, scheduleController.updateSchedule.bind(scheduleController));

  // Delete a schedule
  app.delete('/:id', {
    schema: {
      description: 'Delete a schedule',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, scheduleController.deleteSchedule.bind(scheduleController));

  // Activate a schedule
  app.post('/:id/activate', {
    schema: {
      description: 'Activate a schedule',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, scheduleController.activateSchedule.bind(scheduleController));

  // Deactivate a schedule
  app.post('/:id/deactivate', {
    schema: {
      description: 'Deactivate a schedule',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, scheduleController.deactivateSchedule.bind(scheduleController));

  // Trigger immediate execution
  app.post('/:id/trigger', {
    schema: {
      description: 'Trigger immediate schedule execution',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, scheduleController.triggerSchedule.bind(scheduleController));

  // Get next run times
  app.get('/:id/next-runs', {
    schema: {
      description: 'Get next scheduled run times',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          count: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }, scheduleController.getNextRuns.bind(scheduleController));
}

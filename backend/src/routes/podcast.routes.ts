// Podcast Routes - API endpoints for podcast generation and management

import { FastifyInstance } from 'fastify';
import podcastController from '../controllers/podcast.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

export async function podcastRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authMiddleware);

  // Request podcast generation for a report
  app.post('/reports/:reportId/podcast', {
    schema: {
      description: 'Request podcast generation for a completed report',
      tags: ['Podcasts'],
      params: {
        type: 'object',
        required: ['reportId'],
        properties: {
          reportId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['template', 'duration'],
        properties: {
          template: {
            type: 'string',
            enum: ['EXECUTIVE_BRIEF', 'STRATEGIC_DEBATE', 'INDUSTRY_PULSE'],
            description: 'Podcast template/format',
          },
          duration: {
            type: 'string',
            enum: ['SHORT', 'STANDARD', 'LONG'],
            description: 'Target podcast duration',
          },
          deliveryEnabled: {
            type: 'boolean',
            description: 'Enable automatic Webex delivery after podcast completes',
          },
          deliveryDestination: {
            type: 'string',
            description: 'Webex email or room ID for delivery',
          },
          deliveryDestinationType: {
            type: 'string',
            enum: ['email', 'roomId'],
            description: 'Type of Webex destination',
          },
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
  }, podcastController.requestPodcast.bind(podcastController));

  // Get podcast status for a report
  app.get('/reports/:reportId/podcast/status', {
    schema: {
      description: 'Get podcast generation status for a report',
      tags: ['Podcasts'],
      params: {
        type: 'object',
        required: ['reportId'],
        properties: {
          reportId: { type: 'string', format: 'uuid' },
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
                status: { type: 'string' },
                progress: { type: 'number' },
                message: { type: 'string' },
                error: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, podcastController.getPodcastStatus.bind(podcastController));

  // Get podcast details for a report
  app.get('/reports/:reportId/podcast', {
    schema: {
      description: 'Get podcast details for a report',
      tags: ['Podcasts'],
      params: {
        type: 'object',
        required: ['reportId'],
        properties: {
          reportId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, podcastController.getPodcast.bind(podcastController));

  // Download podcast audio file
  app.get('/reports/:reportId/podcast/download', {
    schema: {
      description: 'Download the generated podcast audio file',
      tags: ['Podcasts'],
      params: {
        type: 'object',
        required: ['reportId'],
        properties: {
          reportId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, podcastController.downloadPodcast.bind(podcastController));

  // Stream podcast audio with HTTP Range support
  app.get('/reports/:reportId/podcast/stream', {
    schema: {
      description: 'Stream podcast audio with HTTP Range request support for seeking',
      tags: ['Podcasts'],
      params: {
        type: 'object',
        required: ['reportId'],
        properties: {
          reportId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, podcastController.streamPodcast.bind(podcastController));

  // Delete podcast for a report
  app.delete('/reports/:reportId/podcast', {
    schema: {
      description: 'Delete the podcast for a report',
      tags: ['Podcasts'],
      params: {
        type: 'object',
        required: ['reportId'],
        properties: {
          reportId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, podcastController.deletePodcast.bind(podcastController));

  // Schedule Webex delivery for a podcast
  app.post('/reports/:reportId/podcast/deliver', {
    schema: {
      description: 'Schedule Webex delivery for a completed podcast',
      tags: ['Podcasts', 'Delivery'],
      params: {
        type: 'object',
        required: ['reportId'],
        properties: {
          reportId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['destination', 'destinationType'],
        properties: {
          destination: { type: 'string', minLength: 1 },
          destinationType: { type: 'string', enum: ['email', 'roomId'] },
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
  }, podcastController.schedulePodcastDelivery.bind(podcastController));

  // Get all deliveries for a podcast
  app.get('/reports/:reportId/podcast/deliveries', {
    schema: {
      description: 'Get all deliveries for a podcast',
      tags: ['Podcasts', 'Delivery'],
      params: {
        type: 'object',
        required: ['reportId'],
        properties: {
          reportId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
          },
        },
      },
    },
  }, podcastController.getPodcastDeliveries.bind(podcastController));

  // Retry a failed podcast delivery
  app.post('/podcast/deliveries/:deliveryId/retry', {
    schema: {
      description: 'Retry a failed podcast delivery',
      tags: ['Podcasts', 'Delivery'],
      params: {
        type: 'object',
        required: ['deliveryId'],
        properties: {
          deliveryId: { type: 'string', format: 'uuid' },
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
  }, podcastController.retryPodcastDelivery.bind(podcastController));

  // Get cost estimate for podcast generation
  app.get('/podcast/estimate', {
    schema: {
      description: 'Get cost estimate for podcast generation',
      tags: ['Podcasts'],
      querystring: {
        type: 'object',
        required: ['duration'],
        properties: {
          duration: {
            type: 'string',
            enum: ['SHORT', 'STANDARD', 'LONG'],
          },
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
                scriptGeneration: { type: 'object' },
                ttsGeneration: { type: 'object' },
                totalCost: { type: 'number' },
                breakdown: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, podcastController.getCostEstimate.bind(podcastController));

  // Get available podcast templates
  app.get('/podcast/templates', {
    schema: {
      description: 'Get available podcast templates and their configurations',
      tags: ['Podcasts'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                templates: { type: 'array' },
                durations: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
    },
  }, podcastController.getTemplates.bind(podcastController));

  // Admin endpoints
  // Get podcast processor status
  app.get('/podcast/processor/status', {
    preHandler: adminMiddleware,
  }, podcastController.getProcessorStatus.bind(podcastController));

  // Get podcast queue statistics
  app.get('/podcast/queue/stats', {
    preHandler: adminMiddleware,
  }, podcastController.getQueueStats.bind(podcastController));

  // Test TTS connection
  app.get('/podcast/test/tts', {
    preHandler: adminMiddleware,
  }, podcastController.testTTS.bind(podcastController));

  // Test FFmpeg availability
  app.get('/podcast/test/ffmpeg', {
    preHandler: adminMiddleware,
  }, podcastController.testFFmpeg.bind(podcastController));
}

export default podcastRoutes;

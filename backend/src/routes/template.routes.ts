// Template Routes - API endpoints for user template management

import { FastifyInstance } from 'fastify';
import { getTemplateController } from '../controllers/template.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export async function templateRoutes(app: FastifyInstance) {
  const templateController = getTemplateController();

  // All routes require authentication
  app.addHook('preHandler', authMiddleware);

  // Create a new template
  app.post('/', {
    schema: {
      description: 'Create a new template',
      tags: ['Templates'],
      body: {
        type: 'object',
        required: ['name', 'workflowType', 'configuration'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 500 },
          workflowType: {
            type: 'string',
            enum: ['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST']
          },
          configuration: {
            type: 'object',
            description: 'Template configuration',
            properties: {
              sections: {
                type: 'array',
                items: { type: 'string' },
                description: 'Report sections to include'
              },
              depth: {
                type: 'string',
                enum: ['brief', 'standard', 'detailed'],
                description: 'Content depth preference'
              },
              competitiveOptions: {
                type: 'object',
                properties: {
                  selectedProducts: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  focusIndustry: { type: 'string' }
                }
              },
              newsDigestOptions: {
                type: 'object',
                properties: {
                  newsFocus: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  timePeriod: {
                    type: 'string',
                    enum: ['last-week', 'last-month', 'last-quarter']
                  },
                  industryFilter: { type: 'string' },
                  outputStyle: {
                    type: 'string',
                    enum: ['executive-brief', 'narrative', 'podcast-ready']
                  }
                }
              },
              delivery: {
                type: 'object',
                properties: {
                  method: { type: 'string', enum: ['WEBEX'] },
                  destination: { type: 'string' },
                  destinationType: { type: 'string', enum: ['email', 'roomId'] },
                  contentType: { type: 'string', enum: ['ATTACHMENT', 'SUMMARY_LINK'] },
                  format: { type: 'string', enum: ['PDF', 'DOCX'] }
                }
              },
              requestedFormats: {
                type: 'array',
                items: { type: 'string', enum: ['PDF', 'DOCX'] }
              },
              podcastOptions: {
                type: 'object',
                properties: {
                  enabled: { type: 'boolean' },
                  template: {
                    type: 'string',
                    enum: ['EXECUTIVE_BRIEF', 'STRATEGIC_DEBATE', 'INDUSTRY_PULSE']
                  },
                  duration: {
                    type: 'string',
                    enum: ['SHORT', 'STANDARD', 'LONG']
                  },
                  deliveryEnabled: { type: 'boolean' },
                  deliveryDestination: { type: 'string' },
                  deliveryDestinationType: {
                    type: 'string',
                    enum: ['email', 'roomId']
                  }
                }
              }
            }
          }
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
  }, templateController.createTemplate.bind(templateController));

  // List templates
  app.get('/', {
    schema: {
      description: 'List user templates',
      tags: ['Templates'],
      querystring: {
        type: 'object',
        properties: {
          workflowType: {
            type: 'string',
            enum: ['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST']
          },
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
  }, templateController.listTemplates.bind(templateController));

  // Get a single template
  app.get('/:id', {
    schema: {
      description: 'Get a template by ID',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
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
  }, templateController.getTemplate.bind(templateController));

  // Update a template
  app.put('/:id', {
    schema: {
      description: 'Update a template',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 500 },
          configuration: {
            type: 'object',
            description: 'Template configuration'
          }
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
  }, templateController.updateTemplate.bind(templateController));

  // Delete a template
  app.delete('/:id', {
    schema: {
      description: 'Delete a template',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
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
  }, templateController.deleteTemplate.bind(templateController));

  // Duplicate a template
  app.post('/:id/duplicate', {
    schema: {
      description: 'Duplicate a template',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
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
  }, templateController.duplicateTemplate.bind(templateController));

  // Apply template to create a report
  app.post('/:id/apply', {
    schema: {
      description: 'Apply template to create a new report',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          companyName: { type: 'string' },
          companyNames: { type: 'array', items: { type: 'string' } },
          additionalContext: { type: 'object' },
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
  }, templateController.applyTemplate.bind(templateController));
}

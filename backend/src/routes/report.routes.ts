// Report Routes - API endpoints for report generation and management

import { FastifyInstance } from 'fastify';
import reportController from '../controllers/report.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

export async function reportRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authMiddleware);

  // Create a new report
  app.post('/', {
    schema: {
      description: 'Create a new report and start generation',
      tags: ['Reports'],
      body: {
        type: 'object',
        required: ['title', 'workflowType'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          workflowType: {
            type: 'string',
            enum: ['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST']
          },
          companyName: { type: 'string' },
          companyNames: { type: 'array', items: { type: 'string' } },
          additionalContext: { type: 'object' },
          llmModel: { type: 'string' },
          requestedFormats: { type: 'array', items: { type: 'string', enum: ['PDF', 'DOCX'] } },
          sections: {
            type: 'array',
            items: { type: 'string' },
            description: 'Sections to generate (defaults to all sections for workflow type)'
          },
          depth: {
            type: 'string',
            enum: ['brief', 'standard', 'detailed'],
            default: 'standard',
            description: 'Content depth preference'
          },
          competitiveOptions: {
            type: 'object',
            description: 'Options specific to Competitive Intelligence workflow',
            properties: {
              selectedProducts: {
                type: 'array',
                items: { type: 'string' },
                description: 'Cisco IIoT product IDs to focus the analysis on'
              },
              focusIndustry: {
                type: 'string',
                description: 'Industry vertical ID to tailor the analysis'
              },
            },
          },
          newsDigestOptions: {
            type: 'object',
            description: 'Options specific to News Digest workflow',
            properties: {
              newsFocus: {
                type: 'array',
                items: { type: 'string' },
                description: 'News topic IDs to prioritize (technology, financials, leadership, etc.)'
              },
              timePeriod: {
                type: 'string',
                enum: ['last-week', 'last-month', 'last-quarter'],
                description: 'Time period for news coverage'
              },
              industryFilter: {
                type: 'string',
                description: 'Industry vertical ID to tailor the news digest'
              },
              outputStyle: {
                type: 'string',
                enum: ['executive-brief', 'narrative', 'podcast-ready'],
                description: 'Output format style'
              },
            },
          },
          delivery: {
            type: 'object',
            description: 'Webex delivery options',
            properties: {
              method: {
                type: 'string',
                enum: ['WEBEX'],
                description: 'Delivery method'
              },
              destination: {
                type: 'string',
                minLength: 1,
                description: 'Email address or Webex room ID'
              },
              destinationType: {
                type: 'string',
                enum: ['email', 'roomId'],
                description: 'Type of destination'
              },
              contentType: {
                type: 'string',
                enum: ['ATTACHMENT', 'SUMMARY_LINK'],
                description: 'Content delivery type'
              },
              format: {
                type: 'string',
                enum: ['PDF', 'DOCX'],
                description: 'Format for attachment delivery'
              },
            },
          },
          podcastOptions: {
            type: 'object',
            description: 'Podcast generation options (triggers after report completes)',
            properties: {
              template: {
                type: 'string',
                enum: ['EXECUTIVE_BRIEF', 'STRATEGIC_DEBATE', 'INDUSTRY_PULSE'],
              },
              duration: {
                type: 'string',
                enum: ['SHORT', 'STANDARD', 'LONG'],
              },
              deliveryEnabled: { type: 'boolean' },
              deliveryDestination: { type: 'string' },
              deliveryDestinationType: {
                type: 'string',
                enum: ['email', 'roomId'],
              },
            },
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
  }, reportController.createReport.bind(reportController));

  // List reports
  app.get('/', {
    schema: {
      description: 'List reports for the authenticated user',
      tags: ['Reports'],
      querystring: {
        type: 'object',
        properties: {
          workflowType: {
            type: 'string',
            enum: ['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST']
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']
          },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
      },
    },
  }, reportController.listReports.bind(reportController));

  // Get a specific report
  app.get('/:id', {
    schema: {
      description: 'Get a specific report by ID',
      tags: ['Reports'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, reportController.getReport.bind(reportController));

  // Get report status
  app.get('/:id/status', {
    schema: {
      description: 'Get the generation status of a report',
      tags: ['Reports'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, reportController.getReportStatus.bind(reportController));

  // Retry a failed report
  app.post('/:id/retry', {
    schema: {
      description: 'Retry generation of a failed report',
      tags: ['Reports'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, reportController.retryReport.bind(reportController));

  // Delete a report
  app.delete('/:id', {
    schema: {
      description: 'Delete a report',
      tags: ['Reports'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, reportController.deleteReport.bind(reportController));

  // Enrich company data
  app.post('/enrich-company', {
    schema: {
      description: 'Validate and enrich company data using LLM',
      tags: ['Reports'],
      body: {
        type: 'object',
        required: ['companyName'],
        properties: {
          companyName: { type: 'string', minLength: 1 },
          additionalInfo: { type: 'string' },
        },
      },
    },
  }, reportController.enrichCompany.bind(reportController));

  // Parse CSV and normalize company names
  app.post('/parse-csv-companies', reportController.parseCSVCompanies.bind(reportController));

  // Get workflow sections
  app.get('/workflows/:workflowType/sections', {
    schema: {
      description: 'Get the sections generated for a workflow type',
      tags: ['Reports'],
      params: {
        type: 'object',
        required: ['workflowType'],
        properties: {
          workflowType: {
            type: 'string',
            enum: ['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST']
          },
        },
      },
    },
  }, reportController.getWorkflowSections.bind(reportController));

  // LLM configuration and testing (admin only)
  app.get('/llm/config', {
    preHandler: adminMiddleware,
  }, reportController.getLLMConfig.bind(reportController));

  app.get('/llm/test', {
    preHandler: adminMiddleware,
  }, reportController.testLLMConnection.bind(reportController));

  // Export endpoints
  // Request export generation
  app.post('/:id/export', {
    schema: {
      description: 'Request PDF or DOCX export for a report',
      tags: ['Exports'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['format'],
        properties: {
          format: { type: 'string', enum: ['PDF', 'DOCX'] },
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
  }, reportController.requestExport.bind(reportController));

  // Get all exports for a report
  app.get('/:id/exports', {
    schema: {
      description: 'Get all export statuses for a report',
      tags: ['Exports'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, reportController.getExports.bind(reportController));

  // Check export status for specific format
  app.get('/:id/export/:format/status', {
    schema: {
      description: 'Check if export is ready for download',
      tags: ['Exports'],
      params: {
        type: 'object',
        required: ['id', 'format'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          format: { type: 'string', enum: ['pdf', 'docx', 'PDF', 'DOCX'] },
        },
      },
    },
  }, reportController.getExportStatus.bind(reportController));

  // Download export file
  app.get('/:id/download/:format', {
    schema: {
      description: 'Download the generated PDF or DOCX file',
      tags: ['Exports'],
      params: {
        type: 'object',
        required: ['id', 'format'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          format: { type: 'string', enum: ['pdf', 'docx', 'PDF', 'DOCX'] },
        },
      },
    },
  }, reportController.downloadExport.bind(reportController));

  // Delivery endpoints
  // Schedule Webex delivery for a completed report
  app.post('/:id/deliver', {
    schema: {
      description: 'Schedule Webex delivery for a completed report',
      tags: ['Delivery'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['destination', 'destinationType', 'contentType'],
        properties: {
          destination: { type: 'string', minLength: 1 },
          destinationType: { type: 'string', enum: ['email', 'roomId'] },
          contentType: { type: 'string', enum: ['ATTACHMENT', 'SUMMARY_LINK'] },
          format: { type: 'string', enum: ['PDF', 'DOCX'] },
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
  }, reportController.scheduleDelivery.bind(reportController));

  // Get all deliveries for a report
  app.get('/:id/deliveries', {
    schema: {
      description: 'Get all deliveries for a report',
      tags: ['Delivery'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, reportController.getDeliveries.bind(reportController));

  // Retry a failed delivery
  app.post('/deliveries/:deliveryId/retry', {
    schema: {
      description: 'Retry a failed delivery',
      tags: ['Delivery'],
      params: {
        type: 'object',
        required: ['deliveryId'],
        properties: {
          deliveryId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, reportController.retryDelivery.bind(reportController));
}

export default reportRoutes;

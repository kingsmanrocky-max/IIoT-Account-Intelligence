// Report Controller - Handles HTTP requests for report generation

import { FastifyRequest, FastifyReply } from 'fastify';
import { WorkflowType, ReportFormat } from '@prisma/client';
import { getReportService } from '../services/report.service';
import { getLLMService } from '../services/llm.service';
import { getExportService } from '../services/export.service';
import { getWebexDeliveryService } from '../services/webex-delivery.service';
import { csvService } from '../services/csv.service';
import logger from '../utils/logger';

interface CreateReportBody {
  title: string;
  workflowType: WorkflowType;
  companyName?: string;
  companyNames?: string[];
  additionalContext?: Record<string, unknown>;
  llmModel?: string;
  requestedFormats?: ReportFormat[];
  sections?: string[];
  depth?: 'brief' | 'standard' | 'detailed';
  competitiveOptions?: {
    selectedProducts?: string[];
    focusIndustry?: string;
  };
  newsDigestOptions?: {
    newsFocus?: string[];
    timePeriod?: string;
    industryFilter?: string;
    outputStyle?: string;
  };
  delivery?: {
    method: 'WEBEX';
    destination: string;
    destinationType: 'email' | 'roomId';
    contentType: 'ATTACHMENT' | 'SUMMARY_LINK';
    format?: ReportFormat;
  };
  podcastOptions?: {
    template: 'EXECUTIVE_BRIEF' | 'STRATEGIC_DEBATE' | 'INDUSTRY_PULSE';
    duration: 'SHORT' | 'STANDARD' | 'LONG';
    deliveryEnabled?: boolean;
    deliveryDestination?: string;
    deliveryDestinationType?: 'email' | 'roomId';
  };
}

interface ListReportsQuery {
  workflowType?: WorkflowType;
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  limit?: number;
  offset?: number;
}

interface EnrichCompanyBody {
  companyName: string;
  additionalInfo?: string;
}

interface RequestExportBody {
  format: ReportFormat;
}

export class ReportController {
  private reportService = getReportService();
  private llmService = getLLMService();
  private exportService = getExportService();

  // Create a new report
  async createReport(
    request: FastifyRequest<{ Body: CreateReportBody }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { title, workflowType, companyName, companyNames, additionalContext, llmModel, requestedFormats, sections, depth, competitiveOptions, newsDigestOptions, delivery, podcastOptions } = request.body;

      // Validate workflow type
      if (!['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST'].includes(workflowType)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_WORKFLOW_TYPE',
            message: 'Invalid workflow type. Must be ACCOUNT_INTELLIGENCE, COMPETITIVE_INTELLIGENCE, or NEWS_DIGEST',
          },
        });
      }

      // Validate requested formats if provided
      if (requestedFormats) {
        const validFormats = ['PDF', 'DOCX'];
        const invalidFormats = requestedFormats.filter(f => !validFormats.includes(f));
        if (invalidFormats.length > 0) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_FORMAT',
              message: `Invalid format(s): ${invalidFormats.join(', ')}. Must be PDF or DOCX`,
            },
          });
        }
      }

      // Normalize competitiveOptions - ensure selectedProducts is an array
      const normalizedCompetitiveOptions = competitiveOptions
        ? {
            selectedProducts: competitiveOptions.selectedProducts || [],
            focusIndustry: competitiveOptions.focusIndustry,
          }
        : undefined;

      // Normalize newsDigestOptions
      const normalizedNewsDigestOptions = newsDigestOptions
        ? {
            newsFocus: newsDigestOptions.newsFocus || [],
            timePeriod: newsDigestOptions.timePeriod,
            industryFilter: newsDigestOptions.industryFilter,
            outputStyle: newsDigestOptions.outputStyle,
          }
        : undefined;

      const report = await this.reportService.createReport({
        userId,
        title,
        workflowType,
        inputData: {
          companyName,
          companyNames,
          additionalContext,
        },
        sections: sections as any,  // Section validation happens in service
        depth,
        competitiveOptions: normalizedCompetitiveOptions,
        newsDigestOptions: normalizedNewsDigestOptions,
        llmModel,
        requestedFormats,
        delivery,
        podcastOptions,
      });

      logger.info(`Report created by user ${userId}: ${report.id}`);

      return reply.status(201).send({
        success: true,
        data: report,
        message: 'Report generation started',
      });
    } catch (error) {
      logger.error('Create report error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CREATE_REPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create report',
        },
      });
    }
  }

  // Get a single report
  async getReport(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      const report = await this.reportService.getReport(id, userId);

      if (!report) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: 'Report not found',
          },
        });
      }

      return reply.send({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Get report error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'GET_REPORT_FAILED',
          message: 'Failed to retrieve report',
        },
      });
    }
  }

  // List reports
  async listReports(
    request: FastifyRequest<{ Querystring: ListReportsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { workflowType, status, limit, offset } = request.query;

      const result = await this.reportService.listReports(userId, {
        workflowType,
        status,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      });

      return reply.send({
        success: true,
        data: result.reports,
        pagination: {
          total: result.total,
          limit: limit || 20,
          offset: offset || 0,
        },
      });
    } catch (error) {
      logger.error('List reports error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'LIST_REPORTS_FAILED',
          message: 'Failed to list reports',
        },
      });
    }
  }

  // Delete a report
  async deleteReport(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      const deleted = await this.reportService.deleteReport(id, userId);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: 'Report not found',
          },
        });
      }

      return reply.send({
        success: true,
        message: 'Report deleted successfully',
      });
    } catch (error) {
      logger.error('Delete report error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DELETE_REPORT_FAILED',
          message: 'Failed to delete report',
        },
      });
    }
  }

  // Retry failed report
  async retryReport(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      const report = await this.reportService.retryReport(id, userId);

      return reply.send({
        success: true,
        data: report,
        message: 'Report generation restarted',
      });
    } catch (error) {
      logger.error('Retry report error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'RETRY_REPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retry report',
        },
      });
    }
  }

  // Get report status
  async getReportStatus(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const status = await this.reportService.getReportStatus(id);

      return reply.send({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Get report status error:', error);
      return reply.status(404).send({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Report not found',
        },
      });
    }
  }

  // Enrich company data
  async enrichCompany(
    request: FastifyRequest<{ Body: EnrichCompanyBody }>,
    reply: FastifyReply
  ) {
    try {
      const { companyName, additionalInfo } = request.body;

      if (!companyName) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_COMPANY_NAME',
            message: 'Company name is required',
          },
        });
      }

      const enrichedData = await this.reportService.enrichCompanyData(companyName, additionalInfo);

      return reply.send({
        success: true,
        data: enrichedData,
      });
    } catch (error) {
      logger.error('Enrich company error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ENRICHMENT_FAILED',
          message: 'Failed to enrich company data',
        },
      });
    }
  }

  // Parse CSV and normalize company names
  async parseCSVCompanies(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get uploaded file
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No file was uploaded',
          },
        });
      }

      // Convert file stream to buffer
      const fileBuffer = await data.toBuffer();
      const fileName = data.filename;

      // Parse CSV
      const parseResult = await csvService.parseCompaniesFromCSV(fileBuffer, fileName);

      // Normalize company names using LLM in batches
      const normalizedCompanies = await this.llmService.normalizeCompanyBatch(parseResult.companies);

      return reply.send({
        success: true,
        data: {
          originalCount: parseResult.originalCount,
          normalizedCompanies,
        },
      });
    } catch (error) {
      logger.error('Parse CSV companies error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file';

      return reply.status(400).send({
        success: false,
        error: {
          code: 'CSV_PARSE_FAILED',
          message: errorMessage,
        },
      });
    }
  }

  // Get LLM configuration (non-sensitive)
  async getLLMConfig(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const config = this.llmService.getConfig();

      return reply.send({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Get LLM config error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Failed to retrieve LLM configuration',
        },
      });
    }
  }

  // Test LLM connectivity
  async testLLMConnection(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const results = await this.llmService.testConnection();

      return reply.send({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Test LLM connection error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CONNECTION_TEST_FAILED',
          message: 'Failed to test LLM connection',
        },
      });
    }
  }

  // Get workflow sections
  async getWorkflowSections(
    request: FastifyRequest<{ Params: { workflowType: WorkflowType } }>,
    reply: FastifyReply
  ) {
    try {
      const { workflowType } = request.params;
      const sections = this.reportService.getWorkflowSections(workflowType);

      return reply.send({
        success: true,
        data: sections,
      });
    } catch (error) {
      logger.error('Get workflow sections error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_WORKFLOW_TYPE',
          message: 'Invalid workflow type',
        },
      });
    }
  }

  // Request export for a report
  async requestExport(
    request: FastifyRequest<{ Params: { id: string }; Body: RequestExportBody }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;
      const { format } = request.body;

      if (!['PDF', 'DOCX'].includes(format)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Format must be PDF or DOCX',
          },
        });
      }

      const exportJob = await this.exportService.requestExport(id, userId, format);

      logger.info(`Export requested for report ${id}: ${format}`);

      return reply.status(201).send({
        success: true,
        data: exportJob,
        message: exportJob.status === 'COMPLETED' ? 'Export ready for download' : 'Export queued for processing',
      });
    } catch (error) {
      logger.error('Request export error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'EXPORT_REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to request export',
        },
      });
    }
  }

  // Get all exports for a report
  async getExports(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const exports = await this.exportService.getExports(id);

      return reply.send({
        success: true,
        data: exports,
      });
    } catch (error) {
      logger.error('Get exports error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'GET_EXPORTS_FAILED',
          message: 'Failed to retrieve exports',
        },
      });
    }
  }

  // Download export file
  async downloadExport(
    request: FastifyRequest<{ Params: { id: string; format: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id, format } = request.params;

      const upperFormat = format.toUpperCase() as ReportFormat;
      if (!['PDF', 'DOCX'].includes(upperFormat)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Format must be PDF or DOCX',
          },
        });
      }

      const result = await this.exportService.getDownloadStream(id, upperFormat, userId);

      if (!result) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'EXPORT_NOT_FOUND',
            message: 'Export not ready or not found',
          },
        });
      }

      return reply
        .header('Content-Type', result.mimeType)
        .header('Content-Disposition', `attachment; filename="${result.filename}"`)
        .header('Content-Length', result.buffer.length)
        .send(result.buffer);
    } catch (error) {
      logger.error('Download export error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: 'Failed to download export',
        },
      });
    }
  }

  // Check export status
  async getExportStatus(
    request: FastifyRequest<{ Params: { id: string; format: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id, format } = request.params;

      const upperFormat = format.toUpperCase() as ReportFormat;
      const isReady = await this.exportService.isExportReady(id, upperFormat);

      return reply.send({
        success: true,
        data: {
          reportId: id,
          format: upperFormat,
          ready: isReady,
        },
      });
    } catch (error) {
      logger.error('Get export status error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: 'Failed to check export status',
        },
      });
    }
  }

  // Schedule Webex delivery for a completed report
  async scheduleDelivery(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        destination: string;
        destinationType: 'email' | 'roomId';
        contentType: 'ATTACHMENT' | 'SUMMARY_LINK';
        format?: ReportFormat;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;
      const { destination, destinationType, contentType, format } = request.body;

      const webexService = getWebexDeliveryService();
      const delivery = await webexService.scheduleDelivery(id, userId, {
        destination,
        destinationType,
        contentType,
        format,
      });

      logger.info(`Webex delivery scheduled for report ${id}`);

      return reply.status(201).send({
        success: true,
        data: delivery,
        message: 'Delivery scheduled successfully',
      });
    } catch (error) {
      logger.error('Schedule delivery error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'SCHEDULE_DELIVERY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to schedule delivery',
        },
      });
    }
  }

  // Get all deliveries for a report
  async getDeliveries(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const webexService = getWebexDeliveryService();
      const deliveries = await webexService.getDeliveries(id);

      return reply.send({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      logger.error('Get deliveries error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'GET_DELIVERIES_FAILED',
          message: 'Failed to retrieve deliveries',
        },
      });
    }
  }

  // Retry a failed delivery
  async retryDelivery(
    request: FastifyRequest<{ Params: { deliveryId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { deliveryId } = request.params;
      const webexService = getWebexDeliveryService();
      const delivery = await webexService.retryDelivery(deliveryId);

      logger.info(`Delivery ${deliveryId} retry initiated`);

      return reply.send({
        success: true,
        data: delivery,
        message: 'Delivery retry initiated',
      });
    } catch (error) {
      logger.error('Retry delivery error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'RETRY_DELIVERY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retry delivery',
        },
      });
    }
  }
}

export default new ReportController();

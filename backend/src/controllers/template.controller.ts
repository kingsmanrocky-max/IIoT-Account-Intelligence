// Template Controller - Handles HTTP requests for user templates

import { FastifyRequest, FastifyReply } from 'fastify';
import { WorkflowType } from '@prisma/client';
import { getUserTemplateService, TemplateConfiguration } from '../services/user-template.service';
import logger from '../utils/logger';

interface CreateTemplateBody {
  name: string;
  description?: string;
  workflowType: WorkflowType;
  configuration: TemplateConfiguration;
}

interface UpdateTemplateBody {
  name?: string;
  description?: string;
  configuration?: TemplateConfiguration;
}

interface ListTemplatesQuery {
  workflowType?: WorkflowType;
  limit?: number;
  offset?: number;
}

interface ApplyTemplateBody {
  title: string;
  companyName?: string;
  companyNames?: string[];
  additionalContext?: Record<string, unknown>;
}

export class TemplateController {
  private templateService = getUserTemplateService();

  // Create a new template
  async createTemplate(
    request: FastifyRequest<{ Body: CreateTemplateBody }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { name, description, workflowType, configuration } = request.body;

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

      const template = await this.templateService.createTemplate({
        userId,
        name,
        description,
        workflowType,
        configuration,
      });

      logger.info(`Template created by user ${userId}: ${template.id}`);

      return reply.status(201).send({
        success: true,
        data: template,
        message: 'Template created successfully',
      });
    } catch (error) {
      logger.error('Create template error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CREATE_TEMPLATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create template',
        },
      });
    }
  }

  // List templates for the user
  async listTemplates(
    request: FastifyRequest<{ Querystring: ListTemplatesQuery }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { workflowType, limit, offset } = request.query;

      const { templates, total } = await this.templateService.getTemplates(userId, {
        workflowType,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      });

      logger.info('Controller received from service:', { templates: JSON.stringify(templates), total });

      const responseData = {
        success: true,
        data: templates,
        pagination: {
          total,
          limit: limit || 20,
          offset: offset || 0,
        },
      };

      logger.info('Controller sending response:', { response: JSON.stringify(responseData) });

      return reply.send(responseData);
    } catch (error) {
      logger.error('List templates error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'LIST_TEMPLATES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list templates',
        },
      });
    }
  }

  // Get a single template
  async getTemplate(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      const template = await this.templateService.getTemplate(id, userId);

      if (!template) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found',
          },
        });
      }

      return reply.send({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('Get template error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'GET_TEMPLATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get template',
        },
      });
    }
  }

  // Update a template
  async updateTemplate(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateTemplateBody }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;
      const { name, description, configuration } = request.body;

      const template = await this.templateService.updateTemplate(id, userId, {
        name,
        description,
        configuration,
      });

      logger.info(`Template updated by user ${userId}: ${id}`);

      return reply.send({
        success: true,
        data: template,
        message: 'Template updated successfully',
      });
    } catch (error) {
      logger.error('Update template error:', error);

      if (error instanceof Error && error.message === 'Template not found') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found',
          },
        });
      }

      return reply.status(400).send({
        success: false,
        error: {
          code: 'UPDATE_TEMPLATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update template',
        },
      });
    }
  }

  // Delete a template
  async deleteTemplate(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      await this.templateService.deleteTemplate(id, userId);

      logger.info(`Template deleted by user ${userId}: ${id}`);

      return reply.send({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      logger.error('Delete template error:', error);

      if (error instanceof Error && error.message === 'Template not found') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found',
          },
        });
      }

      if (error instanceof Error && error.message.includes('Cannot delete template')) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'TEMPLATE_IN_USE',
            message: error.message,
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: {
          code: 'DELETE_TEMPLATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete template',
        },
      });
    }
  }

  // Duplicate a template
  async duplicateTemplate(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      const template = await this.templateService.duplicateTemplate(id, userId);

      logger.info(`Template duplicated by user ${userId}: ${id} -> ${template.id}`);

      return reply.status(201).send({
        success: true,
        data: template,
        message: 'Template duplicated successfully',
      });
    } catch (error) {
      logger.error('Duplicate template error:', error);

      if (error instanceof Error && error.message === 'Template not found') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found',
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: {
          code: 'DUPLICATE_TEMPLATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to duplicate template',
        },
      });
    }
  }

  // Apply template to create a report
  async applyTemplate(
    request: FastifyRequest<{ Params: { id: string }; Body: ApplyTemplateBody }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;
      const { title, companyName, companyNames, additionalContext } = request.body;

      const report = await this.templateService.applyTemplate(id, userId, {
        title,
        companyName,
        companyNames,
        additionalContext,
      });

      logger.info(`Template applied by user ${userId}: ${id} -> Report ${report.id}`);

      return reply.status(201).send({
        success: true,
        data: report,
        message: 'Report created from template',
      });
    } catch (error) {
      logger.error('Apply template error:', error);

      if (error instanceof Error && error.message === 'Template not found') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found',
          },
        });
      }

      return reply.status(400).send({
        success: false,
        error: {
          code: 'APPLY_TEMPLATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to apply template',
        },
      });
    }
  }
}

// Singleton instance
let controllerInstance: TemplateController | null = null;

export function getTemplateController(): TemplateController {
  if (!controllerInstance) {
    controllerInstance = new TemplateController();
  }
  return controllerInstance;
}

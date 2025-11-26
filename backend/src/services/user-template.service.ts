// User Template Service - Handles user-defined report templates
// Allows users to save and reuse report configurations

import { PrismaClient, Template, WorkflowType } from '@prisma/client';
import { getReportService } from './report.service';
import {
  DepthPreference,
  CompetitiveIntelligenceOptions,
  NewsDigestOptions,
  DeliveryOptions,
} from './report.service';
import { ReportSection } from '../types/llm.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Template configuration structure
export interface TemplateConfiguration {
  sections?: ReportSection[];
  depth?: DepthPreference;
  competitiveOptions?: CompetitiveIntelligenceOptions;
  newsDigestOptions?: NewsDigestOptions;
  delivery?: DeliveryOptions;
  requestedFormats?: ('PDF' | 'DOCX')[];
}

export interface CreateTemplateInput {
  userId: string;
  name: string;
  description?: string;
  workflowType: WorkflowType;
  configuration: TemplateConfiguration;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  configuration?: TemplateConfiguration;
}

export interface ListTemplatesParams {
  workflowType?: WorkflowType;
  limit?: number;
  offset?: number;
}

export interface ApplyTemplateInput {
  companyName?: string;
  companyNames?: string[];
  title: string;
  additionalContext?: Record<string, unknown>;
}

export class UserTemplateService {
  // Create a new template
  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    const { userId, name, description, workflowType, configuration } = input;

    logger.info('Creating template', { userId, name, workflowType });

    // Validate name
    if (!name || name.trim().length === 0) {
      throw new Error('Template name is required');
    }

    if (name.length > 200) {
      throw new Error('Template name must be 200 characters or less');
    }

    // Create template
    const template = await prisma.template.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim(),
        workflowType,
        configuration: configuration as any,
      },
    });

    logger.info('Template created', { templateId: template.id, userId });

    return template;
  }

  // Get templates for a user
  async getTemplates(
    userId: string,
    params?: ListTemplatesParams
  ): Promise<{ templates: Template[]; total: number }> {
    const { workflowType, limit = 20, offset = 0 } = params || {};

    const where: any = { userId };
    if (workflowType) {
      where.workflowType = workflowType;
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.template.count({ where }),
    ]);

    return { templates, total };
  }

  // Get a single template
  async getTemplate(id: string, userId: string): Promise<Template | null> {
    const template = await prisma.template.findFirst({
      where: { id, userId },
    });

    return template;
  }

  // Update a template
  async updateTemplate(
    id: string,
    userId: string,
    input: UpdateTemplateInput
  ): Promise<Template> {
    // Verify ownership
    const existing = await prisma.template.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    const { name, description, configuration } = input;

    // Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        throw new Error('Template name is required');
      }
      if (name.length > 200) {
        throw new Error('Template name must be 200 characters or less');
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (configuration !== undefined) updateData.configuration = configuration as any;

    const template = await prisma.template.update({
      where: { id },
      data: updateData,
    });

    logger.info('Template updated', { templateId: id, userId });

    return template;
  }

  // Delete a template
  async deleteTemplate(id: string, userId: string): Promise<void> {
    // Verify ownership
    const existing = await prisma.template.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    // Check if template has associated schedules
    const scheduleCount = await prisma.schedule.count({
      where: { templateId: id },
    });

    if (scheduleCount > 0) {
      throw new Error(
        `Cannot delete template: ${scheduleCount} schedule(s) are using this template. Delete the schedules first.`
      );
    }

    await prisma.template.delete({
      where: { id },
    });

    logger.info('Template deleted', { templateId: id, userId });
  }

  // Duplicate a template
  async duplicateTemplate(id: string, userId: string): Promise<Template> {
    const existing = await prisma.template.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    const newTemplate = await prisma.template.create({
      data: {
        userId,
        name: `${existing.name} (Copy)`,
        description: existing.description,
        workflowType: existing.workflowType,
        configuration: existing.configuration as any,
      },
    });

    logger.info('Template duplicated', {
      originalId: id,
      newId: newTemplate.id,
      userId,
    });

    return newTemplate;
  }

  // Apply template to create a new report
  async applyTemplate(
    templateId: string,
    userId: string,
    input: ApplyTemplateInput
  ): Promise<any> {
    const template = await prisma.template.findFirst({
      where: { id: templateId, userId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const configuration = template.configuration as TemplateConfiguration;
    const reportService = getReportService();

    // Validate input based on workflow type
    if (template.workflowType !== 'NEWS_DIGEST' && !input.companyName) {
      throw new Error('Company name is required for this workflow type');
    }
    if (
      template.workflowType === 'NEWS_DIGEST' &&
      (!input.companyNames || input.companyNames.length === 0)
    ) {
      throw new Error('At least one company name is required for News Digest');
    }

    // Create report using template configuration
    const report = await reportService.createReport({
      userId,
      title: input.title,
      workflowType: template.workflowType,
      inputData: {
        companyName: input.companyName,
        companyNames: input.companyNames,
        additionalContext: input.additionalContext,
      },
      sections: configuration.sections,
      depth: configuration.depth,
      competitiveOptions: configuration.competitiveOptions,
      newsDigestOptions: configuration.newsDigestOptions,
      requestedFormats: configuration.requestedFormats,
      delivery: configuration.delivery,
    });

    logger.info('Report created from template', {
      templateId,
      reportId: report.id,
      userId,
    });

    return report;
  }
}

// Singleton instance
let serviceInstance: UserTemplateService | null = null;

export function getUserTemplateService(): UserTemplateService {
  if (!serviceInstance) {
    serviceInstance = new UserTemplateService();
  }
  return serviceInstance;
}

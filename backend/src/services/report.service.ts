// Report Service - Handles report generation workflow
// Orchestrates LLM content generation and report assembly

import { PrismaClient, Prisma, Report, ReportStatus, WorkflowType, ReportFormat } from '@prisma/client';
import { getLLMService } from './llm.service';
import { getExportService } from './export.service';
import {
  GenerationContext,
  GeneratedContent,
  ReportSection,
  WorkflowType as LLMWorkflowType,
} from '../types/llm.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Workflow section mappings
const WORKFLOW_SECTIONS: Record<WorkflowType, ReportSection[]> = {
  ACCOUNT_INTELLIGENCE: [
    'account_overview',
    'financial_health',
    'security_events',
    'current_events',
  ],
  COMPETITIVE_INTELLIGENCE: [
    'executive_summary',
    'company_overview',
    'product_offerings',
    'competitive_positioning',
    'strengths_weaknesses',
    'cisco_analysis',
    'recommendations',
  ],
  NEWS_DIGEST: ['news_narrative'],
};

// Depth preference type
export type DepthPreference = 'brief' | 'standard' | 'detailed';

// Competitive Intelligence options
export interface CompetitiveIntelligenceOptions {
  selectedProducts: string[];  // Cisco IIoT product IDs
  focusIndustry?: string;      // Industry vertical ID
}

// News Digest options
export interface NewsDigestOptions {
  newsFocus?: string[];      // Multi-select topic IDs
  timePeriod?: string;       // Single-select: last-week, last-month, last-quarter
  industryFilter?: string;   // Single-select industry ID
  outputStyle?: string;      // Single-select: executive-brief, narrative, podcast-ready
}

// Section descriptions for UI display
export const SECTION_DESCRIPTIONS: Record<ReportSection, string> = {
  account_overview: 'Company background, industry position, and key business facts',
  financial_health: 'Revenue, growth metrics, and financial indicators',
  security_events: 'Cybersecurity incidents, vulnerabilities, and compliance status',
  current_events: 'Recent news, announcements, and market activity',
  executive_summary: 'High-level overview and key findings',
  company_overview: 'Company history, structure, and market presence',
  product_offerings: 'Products, services, and solution portfolio',
  competitive_positioning: 'Market position and competitive landscape',
  strengths_weaknesses: 'SWOT analysis and strategic assessment',
  cisco_analysis: 'Cisco-specific competitive analysis and opportunities',
  recommendations: 'Strategic recommendations and next steps',
  news_narrative: 'Curated news digest and market intelligence',
};

// Section display names
export const SECTION_DISPLAY_NAMES: Record<ReportSection, string> = {
  account_overview: 'Account Overview',
  financial_health: 'Financial Health',
  security_events: 'Security Events',
  current_events: 'Current Events',
  executive_summary: 'Executive Summary',
  company_overview: 'Company Overview',
  product_offerings: 'Product Offerings',
  competitive_positioning: 'Competitive Positioning',
  strengths_weaknesses: 'Strengths & Weaknesses',
  cisco_analysis: 'Cisco Analysis',
  recommendations: 'Recommendations',
  news_narrative: 'News Narrative',
};

// Webex delivery options
export interface DeliveryOptions {
  method: 'WEBEX';
  destination: string;
  destinationType: 'email' | 'roomId';
  contentType: 'ATTACHMENT' | 'SUMMARY_LINK';
  format?: ReportFormat;
}

export interface CreateReportInput {
  userId: string;
  title: string;
  workflowType: WorkflowType;
  inputData: {
    companyName?: string;
    companyNames?: string[];
    additionalContext?: Record<string, unknown>;
  };
  sections?: ReportSection[];  // Optional section selection
  depth?: DepthPreference;  // Optional depth preference
  competitiveOptions?: CompetitiveIntelligenceOptions;  // CI-specific options
  newsDigestOptions?: NewsDigestOptions;  // ND-specific options
  llmModel?: string;
  requestedFormats?: ReportFormat[];
  delivery?: DeliveryOptions;  // Webex delivery options
  podcastOptions?: {
    template: 'EXECUTIVE_BRIEF' | 'STRATEGIC_DEBATE' | 'INDUSTRY_PULSE';
    duration: 'SHORT' | 'STANDARD' | 'LONG';
    deliveryEnabled?: boolean;
    deliveryDestination?: string;
    deliveryDestinationType?: 'email' | 'roomId';
  };
}

export interface ReportWithContent extends Report {
  generatedSections?: GeneratedContent[];
}

export class ReportService {
  private llmService = getLLMService();

  // Create a new report and start generation
  async createReport(input: CreateReportInput): Promise<Report> {
    const { userId, title, workflowType, inputData, sections, depth, competitiveOptions, newsDigestOptions, llmModel, requestedFormats, delivery, podcastOptions } = input;

    // Validate input
    if (workflowType !== 'NEWS_DIGEST' && !inputData.companyName) {
      throw new Error('Company name is required for this workflow type');
    }
    if (workflowType === 'NEWS_DIGEST' && (!inputData.companyNames || inputData.companyNames.length === 0)) {
      throw new Error('At least one company name is required for News Digest');
    }

    // Validate sections if provided
    const defaultSections = WORKFLOW_SECTIONS[workflowType];
    const selectedSections = sections && sections.length > 0 ? sections : defaultSections;

    // Ensure all selected sections are valid for this workflow
    const invalidSections = selectedSections.filter(s => !defaultSections.includes(s));
    if (invalidSections.length > 0) {
      throw new Error(`Invalid sections for ${workflowType}: ${invalidSections.join(', ')}`);
    }

    // Determine depth preference (default to standard)
    const depthPreference: DepthPreference = depth || 'standard';

    // Calculate max tokens based on depth
    const tokensByDepth = { brief: 1000, standard: 4000, detailed: 6000 };
    const maxTokens = tokensByDepth[depthPreference];

    // Create report record
    const report = await prisma.report.create({
      data: {
        userId,
        title,
        workflowType,
        status: 'PENDING',
        inputData: inputData as any,
        configuration: {
          sections: selectedSections,
          depth: depthPreference,
          temperature: 0.7,
          maxTokens,
          // Store CI options if this is a competitive intelligence report
          ...(workflowType === 'COMPETITIVE_INTELLIGENCE' && competitiveOptions && {
            competitiveOptions,
          }),
          // Store ND options if this is a news digest report
          ...(workflowType === 'NEWS_DIGEST' && newsDigestOptions && {
            newsDigestOptions,
          }),
          // Store delivery options if provided
          ...(delivery && { delivery }),
          // Store podcast options if provided
          ...(podcastOptions && { podcastOptions }),
        } as any,
        llmModel: llmModel || 'gpt-4',
        requestedFormats: requestedFormats || [],
      },
    });

    logger.info(`Report created: ${report.id} - ${title}`);

    // Start async generation (don't await)
    this.generateReportContent(report.id, userId).catch((error) => {
      logger.error(`Report generation failed for ${report.id}:`, error);
    });

    return report;
  }

  // Generate all content sections for a report
  async generateReportContent(reportId: string, userId?: string): Promise<void> {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    // Update status to processing
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'PROCESSING' },
    });

    try {
      // Use configured sections from report, fall back to workflow defaults
      const configuration = report.configuration as {
        sections?: ReportSection[];
        depth?: DepthPreference;
        maxTokens?: number;
        competitiveOptions?: CompetitiveIntelligenceOptions;
        newsDigestOptions?: NewsDigestOptions;
      } | null;
      const sections = configuration?.sections || WORKFLOW_SECTIONS[report.workflowType];
      const depth = configuration?.depth || 'standard';
      const competitiveOptions = configuration?.competitiveOptions;
      const newsDigestOptions = configuration?.newsDigestOptions;
      const inputData = report.inputData as any;
      const generatedContent: Record<string, GeneratedContent> = {};

      let totalTokens = 0;
      const startTime = Date.now();

      // Generate each section
      for (const section of sections) {
        logger.debug(`Generating section ${section} for report ${reportId} (depth: ${depth})`);

        const context: GenerationContext = {
          workflowType: report.workflowType as LLMWorkflowType,
          section,
          companyName: inputData.companyName,
          companyNames: inputData.companyNames,
          additionalContext: {
            ...inputData.additionalContext,
            // Include competitive options for CI workflow
            ...(competitiveOptions && { competitiveOptions }),
            // Include news digest options for ND workflow
            ...(newsDigestOptions && { newsDigestOptions }),
          },
          depth,  // Pass depth preference to LLM
        };

        const content = await this.llmService.generateSection(context);
        generatedContent[section] = content;
        totalTokens += content.metadata.tokens;

        logger.debug(`Section ${section} generated: ${content.metadata.tokens} tokens`);
      }

      const generationTimeMs = Date.now() - startTime;

      // Update report with generated content
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'COMPLETED',
          generatedContent: generatedContent as any,
          completedAt: new Date(),
        },
      });

      // Update daily analytics aggregate
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.reportAnalytics.upsert({
        where: {
          date_workflowType: {
            date: today,
            workflowType: report.workflowType,
          },
        },
        create: {
          date: today,
          workflowType: report.workflowType,
          totalGenerated: 1,
          avgDuration: generationTimeMs,
        },
        update: {
          totalGenerated: { increment: 1 },
          avgDuration: generationTimeMs, // Simplified - could calculate running average
        },
      });

      logger.info(`Report ${reportId} completed: ${sections.length} sections, ${totalTokens} tokens, ${generationTimeMs}ms`);

      // Trigger eager export generation if formats were requested
      if (report.requestedFormats && report.requestedFormats.length > 0 && userId) {
        const exportService = getExportService();
        await exportService.triggerEagerGeneration(reportId, report.requestedFormats, userId);
        logger.info(`Eager export generation triggered for report ${reportId}: ${report.requestedFormats.join(', ')}`);
      }

      // Create delivery record if Webex delivery was requested
      const deliveryConfig = (report.configuration as any)?.delivery as DeliveryOptions | undefined;
      if (deliveryConfig && deliveryConfig.method === 'WEBEX') {
        await prisma.reportDelivery.create({
          data: {
            reportId,
            method: 'WEBEX',
            destination: deliveryConfig.destination,
            destinationType: deliveryConfig.destinationType,
            contentType: deliveryConfig.contentType,
            format: deliveryConfig.format || 'PDF',
            status: 'PENDING',
          },
        });
        logger.info(`Webex delivery scheduled for report ${reportId}`);
      }

      // Trigger podcast generation if podcast was requested
      const podcastConfig = (report.configuration as any)?.podcastOptions;
      if (podcastConfig) {
        try {
          const { getPodcastService } = await import('./podcast.service');
          const podcastService = getPodcastService();
          await podcastService.requestPodcast({
            reportId,
            userId: report.userId,
            template: podcastConfig.template,
            duration: podcastConfig.duration,
            triggeredBy: 'EAGER',
            deliveryEnabled: podcastConfig.deliveryEnabled,
            deliveryDestination: podcastConfig.deliveryDestination,
            deliveryDestinationType: podcastConfig.deliveryDestinationType,
          });
          logger.info(`Eager podcast generation triggered for report ${reportId}`);
        } catch (err) {
          logger.error(`Failed to trigger eager podcast for report ${reportId}:`, err);
          // Don't fail the report if podcast fails
        }
      }
    } catch (error) {
      logger.error(`Report generation error for ${reportId}:`, error);

      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'FAILED',
          generatedContent: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });

      throw error;
    }
  }

  // Get report by ID
  async getReport(reportId: string, userId: string): Promise<Report | null> {
    return prisma.report.findFirst({
      where: {
        id: reportId,
        userId,
      },
      include: {
        deliveries: true,
      },
    });
  }

  // List reports for a user
  async listReports(
    userId: string,
    options: {
      workflowType?: WorkflowType;
      status?: ReportStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ reports: Report[]; total: number }> {
    const { workflowType, status, limit = 20, offset = 0 } = options;

    const where: any = { userId };
    if (workflowType) where.workflowType = workflowType;
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.report.count({ where }),
    ]);

    return { reports, total };
  }

  // Delete a report
  async deleteReport(reportId: string, userId: string): Promise<boolean> {
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      return false;
    }

    await prisma.report.delete({ where: { id: reportId } });
    logger.info(`Report deleted: ${reportId}`);
    return true;
  }

  // Retry failed report generation
  async retryReport(reportId: string, userId: string): Promise<Report> {
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId, status: 'FAILED' },
    });

    if (!report) {
      throw new Error('Report not found or not in failed state');
    }

    // Reset status
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'PENDING',
        generatedContent: Prisma.JsonNull,
      },
    });

    // Restart generation
    this.generateReportContent(reportId, userId).catch((error) => {
      logger.error(`Report retry failed for ${reportId}:`, error);
    });

    return report;
  }

  // Get report generation status
  async getReportStatus(reportId: string): Promise<{ status: ReportStatus; progress?: number }> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { status: true, workflowType: true, generatedContent: true },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Calculate progress based on generated sections
    let progress: number | undefined;
    if (report.status === 'PROCESSING' && report.generatedContent) {
      const totalSections = WORKFLOW_SECTIONS[report.workflowType].length;
      const completedSections = Object.keys(report.generatedContent as object).length;
      progress = Math.round((completedSections / totalSections) * 100);
    }

    return { status: report.status, progress };
  }

  // Enrich company data
  async enrichCompanyData(companyName: string, additionalInfo?: string): Promise<Record<string, unknown>> {
    return this.llmService.enrichCompanyData(companyName, additionalInfo);
  }

  // Get workflow sections with descriptions
  getWorkflowSections(workflowType: WorkflowType): Array<{
    key: ReportSection;
    name: string;
    description: string;
  }> {
    const sections = WORKFLOW_SECTIONS[workflowType] || [];
    return sections.map(key => ({
      key,
      name: SECTION_DISPLAY_NAMES[key] || key,
      description: SECTION_DESCRIPTIONS[key] || '',
    }));
  }

  // Get all available sections for a workflow (just keys)
  getWorkflowSectionKeys(workflowType: WorkflowType): ReportSection[] {
    return WORKFLOW_SECTIONS[workflowType] || [];
  }

  // Generate report title using LLM
  async generateReportTitle(
    workflowType: 'ACCOUNT_INTELLIGENCE' | 'COMPETITIVE_INTELLIGENCE' | 'NEWS_DIGEST',
    companyName: string,
    additionalContext?: string[]
  ): Promise<string> {
    return this.llmService.generateReportTitle(workflowType, companyName, additionalContext);
  }
}

// Singleton instance
let reportServiceInstance: ReportService | null = null;

export function getReportService(): ReportService {
  if (!reportServiceInstance) {
    reportServiceInstance = new ReportService();
  }
  return reportServiceInstance;
}

export default ReportService;

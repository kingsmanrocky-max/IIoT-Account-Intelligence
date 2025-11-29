// Webex Delivery Service - Handles sending reports via Webex
import { PrismaClient, Report, ReportDelivery, ReportFormat, PodcastGeneration, PodcastDelivery } from '@prisma/client';
import FormData from 'form-data';
import * as fs from 'fs';
import { config } from '../config/env';
import logger from '../utils/logger';
import { getAdminService } from './admin.service';
import { getExportService } from './export.service';
import {
  WebexDeliveryResult,
  WebexDeliveryError,
  WebexMessageResponse,
  WebexContentMode,
} from '../types/webex.types';

const prisma = new PrismaClient();

const WEBEX_API_BASE_URL = 'https://webexapis.com/v1';
// const MAX_RETRIES = 3;
// const RETRY_DELAY_MS = 1000;

export class WebexDeliveryService {
  // Process a pending delivery record
  async deliverReport(deliveryId: string): Promise<WebexDeliveryResult> {
    logger.info('Attempting to deliver report via Webex', { deliveryId });

    const delivery = await prisma.reportDelivery.findUnique({
      where: { id: deliveryId },
      include: { report: true },
    });

    if (!delivery) {
      logger.error('Delivery record not found', { deliveryId });
      throw new WebexDeliveryError('Delivery not found', 'INVALID_DESTINATION', false);
    }

    logger.info('Delivery record loaded', {
      deliveryId,
      reportId: delivery.reportId,
      status: delivery.status,
      method: delivery.method,
      contentType: delivery.contentType,
      destination: delivery.destination,
      destinationType: delivery.destinationType,
    });

    if (delivery.status !== 'PENDING') {
      logger.warn('Delivery is not in PENDING status', {
        deliveryId,
        currentStatus: delivery.status,
      });
      throw new WebexDeliveryError('Delivery is not pending', 'INVALID_DESTINATION', false);
    }

    if (delivery.method !== 'WEBEX') {
      logger.error('Delivery method is not WEBEX', {
        deliveryId,
        method: delivery.method,
      });
      throw new WebexDeliveryError('Delivery method is not WEBEX', 'INVALID_DESTINATION', false);
    }

    // Get Webex token
    const adminService = getAdminService();
    const settings = await adminService.getSettings();

    if (!settings.webexBotToken) {
      logger.error('Webex bot token not configured');
      throw new WebexDeliveryError('Webex bot token not configured', 'AUTH_FAILED', false);
    }

    try {
      let messageResponse: WebexMessageResponse;

      if (delivery.contentType === 'ATTACHMENT') {
        logger.info('Sending report with attachment', {
          deliveryId,
          reportId: delivery.reportId,
          format: delivery.format,
        });
        messageResponse = await this.sendWithAttachment(
          delivery,
          delivery.report,
          settings.webexBotToken
        );
      } else {
        logger.info('Sending report with summary link', {
          deliveryId,
          reportId: delivery.reportId,
        });
        messageResponse = await this.sendWithSummaryLink(
          delivery,
          delivery.report,
          settings.webexBotToken
        );
      }

      // Update delivery record
      await prisma.reportDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SENT',
          messageId: messageResponse.id,
          deliveredAt: new Date(),
          error: null,
        },
      });

      logger.info(`Webex delivery ${deliveryId} completed successfully`);

      return {
        success: true,
        deliveryId,
        messageId: messageResponse.id,
        deliveredAt: new Date(),
      };
    } catch (error) {
      const webexError = this.handleError(error);

      // Update delivery record
      const newRetryCount = delivery.retryCount + 1;
      const shouldRetry = webexError.retryable && newRetryCount < delivery.maxRetries;

      await prisma.reportDelivery.update({
        where: { id: deliveryId },
        data: {
          status: shouldRetry ? 'PENDING' : 'FAILED',
          error: webexError.message,
          retryCount: newRetryCount,
        },
      });

      logger.error(`Webex delivery ${deliveryId} failed:`, webexError);

      return {
        success: false,
        deliveryId,
        error: webexError.message,
      };
    }
  }

  // Send report with PDF/DOCX attachment
  private async sendWithAttachment(
    delivery: ReportDelivery,
    report: Report,
    token: string
  ): Promise<WebexMessageResponse> {
    const exportService = getExportService();
    const format = (delivery.format || 'PDF') as ReportFormat;

    logger.info('Attempting to get export file for attachment', {
      reportId: report.id,
      format,
    });

    // Get export file
    const download = await exportService.getDownloadStream(
      report.id,
      format,
      report.userId
    );

    if (!download) {
      logger.warn('Export file not ready, triggering export generation', {
        reportId: report.id,
        format,
      });

      // Try to trigger export if not ready
      await exportService.requestExport(report.id, report.userId, format, 'EAGER');

      // Retry with exponential backoff - more resilient to server load
      const maxRetries = 3;
      const baseDelay = 5000; // 5 seconds

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const waitTime = baseDelay * attempt; // 5s, 10s, 15s
        logger.info(`Waiting ${waitTime / 1000} seconds for export to generate (attempt ${attempt}/${maxRetries})...`);
        await this.sleep(waitTime);

        const retryDownload = await exportService.getDownloadStream(
          report.id,
          format,
          report.userId
        );

        logger.info(`Retry attempt ${attempt} result`, {
          reportId: report.id,
          format,
          available: !!retryDownload,
        });

        if (retryDownload) {
          return this.sendMultipartMessage(
            delivery,
            report,
            retryDownload.buffer,
            retryDownload.filename,
            retryDownload.mimeType,
            token
          );
        }
      }

      // All retries exhausted
      throw new WebexDeliveryError(
        `Export not ready after ${maxRetries} retries`,
        'EXPORT_NOT_READY',
        true
      );
    }

    return this.sendMultipartMessage(
      delivery,
      report,
      download.buffer,
      download.filename,
      download.mimeType,
      token
    );
  }

  // Send multipart message with file attachment
  private async sendMultipartMessage(
    delivery: ReportDelivery,
    report: Report,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    token: string
  ): Promise<WebexMessageResponse> {
    const markdown = this.buildAttachmentMessage(report);
    const form = new FormData();

    // Add destination
    if (delivery.destinationType === 'email') {
      form.append('toPersonEmail', delivery.destination);
    } else {
      form.append('roomId', delivery.destination);
    }

    // Add markdown message
    form.append('markdown', markdown);

    // Add file
    form.append('files', fileBuffer, {
      filename,
      contentType: mimeType,
    });

    const response = await fetch(`${WEBEX_API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw this.createApiError(response.status, errorText);
    }

    return response.json() as Promise<WebexMessageResponse>;
  }

  // Send summary message with download link
  private async sendWithSummaryLink(
    delivery: ReportDelivery,
    report: Report,
    token: string
  ): Promise<WebexMessageResponse> {
    const markdown = this.buildSummaryMessage(report);

    const body: Record<string, string> = {
      markdown,
    };

    // Add destination
    if (delivery.destinationType === 'email') {
      body.toPersonEmail = delivery.destination;
    } else {
      body.roomId = delivery.destination;
    }

    const response = await fetch(`${WEBEX_API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw this.createApiError(response.status, errorText);
    }

    return response.json() as Promise<WebexMessageResponse>;
  }

  // Build markdown message for attachment delivery
  private buildAttachmentMessage(report: Report): string {
    const inputData = report.inputData as Record<string, any>;
    const companyName = inputData?.companyName || inputData?.companyNames?.join(', ') || 'Multiple Companies';

    const workflowLabels: Record<string, string> = {
      ACCOUNT_INTELLIGENCE: 'Account Intelligence Report',
      COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence Report',
      NEWS_DIGEST: 'News Digest',
    };

    const workflowLabel = workflowLabels[report.workflowType] || 'Report';

    return `**${workflowLabel}**

**${report.title}**
**Company:** ${companyName}
**Generated:** ${new Date(report.completedAt || report.createdAt).toLocaleDateString()}

_Report attached below._

---
_Generated by IIoT Account Intelligence_`;
  }

  // Build markdown message with summary and download link
  private buildSummaryMessage(report: Report): string {
    const inputData = report.inputData as Record<string, any>;
    const generatedContent = report.generatedContent as Record<string, any> | null;
    const companyName = inputData?.companyName || inputData?.companyNames?.join(', ') || 'Multiple Companies';

    const workflowLabels: Record<string, string> = {
      ACCOUNT_INTELLIGENCE: 'Account Intelligence Report',
      COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence Report',
      NEWS_DIGEST: 'News Digest',
    };

    const workflowLabel = workflowLabels[report.workflowType] || 'Report';

    // Extract executive summary or first section content
    let summary = '';
    if (generatedContent) {
      const executiveSummary = generatedContent.executive_summary ||
        generatedContent.overview ||
        generatedContent.news_narrative;

      if (executiveSummary?.content) {
        // Get first 500 chars of content
        summary = executiveSummary.content.substring(0, 500);
        if (executiveSummary.content.length > 500) {
          summary += '...';
        }
      }
    }

    // Build download URL
    const frontendUrl = config.frontendUrl || 'http://localhost:3000';
    const downloadUrl = `${frontendUrl}/reports/${report.id}`;

    let message = `## ${workflowLabel}

**${report.title}**
**Company:** ${companyName}
**Generated:** ${new Date(report.completedAt || report.createdAt).toLocaleDateString()}`;

    if (summary) {
      message += `

### Summary
${summary}`;
    }

    // List sections if available
    if (generatedContent) {
      const sections = Object.keys(generatedContent);
      if (sections.length > 0) {
        message += `

**Sections:**
${sections.map((s) => `- ${this.formatSectionName(s)}`).join('\n')}`;
      }
    }

    message += `

---
[View Full Report](${downloadUrl})

_Generated by IIoT Account Intelligence_`;

    return message;
  }

  // Format section name for display
  private formatSectionName(key: string): string {
    return key
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Create API error from response
  private createApiError(statusCode: number, errorText: string): WebexDeliveryError {
    let code: WebexDeliveryError['code'] = 'API_ERROR';
    let retryable = false;

    switch (statusCode) {
      case 401:
        code = 'AUTH_FAILED';
        break;
      case 404:
        code = 'ROOM_NOT_FOUND';
        break;
      case 429:
        code = 'RATE_LIMITED';
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
        code = 'API_ERROR';
        retryable = true;
        break;
    }

    return new WebexDeliveryError(
      `Webex API error (${statusCode}): ${errorText}`,
      code,
      retryable,
      statusCode
    );
  }

  // Handle any error and convert to WebexDeliveryError
  private handleError(error: unknown): WebexDeliveryError {
    if (error instanceof WebexDeliveryError) {
      return error;
    }

    if (error instanceof Error) {
      // Network errors are retryable
      if (error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ENOTFOUND')) {
        return new WebexDeliveryError(
          `Network error: ${error.message}`,
          'NETWORK_ERROR',
          true,
          undefined,
          error
        );
      }

      return new WebexDeliveryError(
        error.message,
        'API_ERROR',
        false,
        undefined,
        error
      );
    }

    return new WebexDeliveryError(
      'Unknown error occurred',
      'API_ERROR',
      false
    );
  }

  // Sleep helper
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Schedule a delivery for a report
  async scheduleDelivery(
    reportId: string,
    userId: string,
    options: {
      destination: string;
      destinationType: 'email' | 'roomId';
      contentType: WebexContentMode;
      format?: ReportFormat;
    }
  ): Promise<ReportDelivery> {
    // Verify report exists and belongs to user
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Create delivery record
    return prisma.reportDelivery.create({
      data: {
        reportId,
        method: 'WEBEX',
        destination: options.destination,
        destinationType: options.destinationType,
        contentType: options.contentType,
        format: options.format || 'PDF',
        status: 'PENDING',
      },
    });
  }

  // Get deliveries for a report
  async getDeliveries(reportId: string): Promise<ReportDelivery[]> {
    return prisma.reportDelivery.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Retry a failed delivery
  async retryDelivery(deliveryId: string): Promise<ReportDelivery> {
    const delivery = await prisma.reportDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    if (delivery.status !== 'FAILED') {
      throw new Error('Only failed deliveries can be retried');
    }

    return prisma.reportDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'PENDING',
        error: null,
        retryCount: 0,
      },
    });
  }

  // ==================== PODCAST DELIVERY METHODS ====================

  // Schedule podcast delivery
  async schedulePodcastDelivery(
    podcastId: string,
    userId: string,
    options: {
      destination: string;
      destinationType: 'email' | 'roomId';
    }
  ): Promise<PodcastDelivery> {
    // Verify podcast exists and is completed
    const podcast = await prisma.podcastGeneration.findUnique({
      where: { id: podcastId },
      include: { report: true },
    });

    if (!podcast) {
      throw new Error('Podcast not found');
    }

    if (podcast.status !== 'COMPLETED') {
      throw new Error('Podcast is not completed');
    }

    // Verify user owns the report
    if (podcast.report.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Create delivery record
    return prisma.podcastDelivery.create({
      data: {
        podcastId,
        method: 'WEBEX',
        destination: options.destination,
        destinationType: options.destinationType,
        status: 'PENDING',
      },
    });
  }

  // Deliver podcast via Webex
  async deliverPodcast(deliveryId: string): Promise<WebexDeliveryResult> {
    const delivery = await prisma.podcastDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        podcast: {
          include: { report: true },
        },
      },
    });

    if (!delivery) {
      throw new WebexDeliveryError('Delivery not found', 'INVALID_DESTINATION', false);
    }

    if (delivery.status !== 'PENDING') {
      throw new WebexDeliveryError('Delivery is not pending', 'INVALID_DESTINATION', false);
    }

    // Get Webex token
    const adminService = getAdminService();
    const settings = await adminService.getSettings();

    if (!settings.webexBotToken) {
      throw new WebexDeliveryError('Webex bot token not configured', 'AUTH_FAILED', false);
    }

    try {
      // Get podcast file
      if (!delivery.podcast.finalAudioPath || !fs.existsSync(delivery.podcast.finalAudioPath)) {
        throw new WebexDeliveryError('Podcast file not found', 'EXPORT_NOT_READY', false);
      }

      const fileBuffer = fs.readFileSync(delivery.podcast.finalAudioPath);
      const filename = `podcast_${delivery.podcast.reportId.substring(0, 8)}.mp3`;

      // Send via Webex using the existing sendMultipartMessage method
      const messageResponse = await this.sendMultipartMessage(
        delivery as any,
        delivery.podcast.report,
        fileBuffer,
        filename,
        'audio/mpeg',
        settings.webexBotToken
      );

      // Update delivery record
      await prisma.podcastDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SENT',
          messageId: messageResponse.id,
          deliveredAt: new Date(),
          error: null,
        },
      });

      logger.info(`Podcast delivery ${deliveryId} completed successfully`);

      return {
        success: true,
        deliveryId,
        messageId: messageResponse.id,
        deliveredAt: new Date(),
      };
    } catch (error) {
      const webexError = this.handleError(error);

      const newRetryCount = delivery.retryCount + 1;
      const shouldRetry = webexError.retryable && newRetryCount < delivery.maxRetries;

      await prisma.podcastDelivery.update({
        where: { id: deliveryId },
        data: {
          status: shouldRetry ? 'PENDING' : 'FAILED',
          error: webexError.message,
          retryCount: newRetryCount,
        },
      });

      logger.error(`Podcast delivery ${deliveryId} failed:`, webexError);

      return {
        success: false,
        deliveryId,
        error: webexError.message,
      };
    }
  }

  // Build markdown message for podcast delivery
  private buildPodcastMessage(podcast: PodcastGeneration, report: Report): string {
    const inputData = report.inputData as Record<string, any>;
    const companyName = inputData?.companyName || inputData?.companyNames?.join(', ') || 'Multiple Companies';

    const templateLabels: Record<string, string> = {
      EXECUTIVE_BRIEF: 'Executive Brief',
      STRATEGIC_DEBATE: 'Strategic Debate',
      INDUSTRY_PULSE: 'Industry Pulse',
    };

    const templateLabel = templateLabels[podcast.template] || 'Podcast';
    const durationMinutes = podcast.durationSeconds ? Math.round(podcast.durationSeconds / 60) : 0;

    return `**Podcast: ${templateLabel}**

**Report:** ${report.title}
**Company:** ${companyName}
**Duration:** ${durationMinutes} minutes
**Generated:** ${new Date(podcast.completedAt || podcast.createdAt).toLocaleDateString()}

_Audio file attached below._

---
_Generated by IIoT Account Intelligence_`;
  }

  // Get podcast deliveries
  async getPodcastDeliveries(podcastId: string): Promise<PodcastDelivery[]> {
    return prisma.podcastDelivery.findMany({
      where: { podcastId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Retry failed podcast delivery
  async retryPodcastDelivery(deliveryId: string): Promise<PodcastDelivery> {
    const delivery = await prisma.podcastDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    if (delivery.status !== 'FAILED') {
      throw new Error('Only failed deliveries can be retried');
    }

    return prisma.podcastDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'PENDING',
        error: null,
        retryCount: 0,
      },
    });
  }

  // ==================== GENERIC WEBEX MESSAGE METHODS ====================

  /**
   * Send a generic Webex message (for non-report use cases like account requests)
   */
  async sendWebexMessage(
    destination: string,
    message: string,
    destinationType: 'email' | 'roomId'
  ): Promise<WebexMessageResponse> {
    // Get Webex token from admin settings
    const adminService = getAdminService();
    const settings = await adminService.getSettings();

    if (!settings.webexBotToken) {
      throw new WebexDeliveryError('Webex bot token not configured', 'AUTH_FAILED', false);
    }

    const body: Record<string, string> = {
      markdown: message,
    };

    // Add destination
    if (destinationType === 'email') {
      body.toPersonEmail = destination;
    } else {
      body.roomId = destination;
    }

    const response = await fetch(`${WEBEX_API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.webexBotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw this.createApiError(response.status, errorText);
    }

    return response.json() as Promise<WebexMessageResponse>;
  }
}

// Singleton instance
let webexDeliveryServiceInstance: WebexDeliveryService | null = null;

export function getWebexDeliveryService(): WebexDeliveryService {
  if (!webexDeliveryServiceInstance) {
    webexDeliveryServiceInstance = new WebexDeliveryService();
  }
  return webexDeliveryServiceInstance;
}

export default WebexDeliveryService;

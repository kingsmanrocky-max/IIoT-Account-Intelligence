// Export Service - Handles PDF and DOCX generation
import { PrismaClient, Report, DocumentExport, ReportFormat, ExportTrigger } from '@prisma/client';
import puppeteer from 'puppeteer';
import { Document, Packer, Paragraph, HeadingLevel, TextRun, TableOfContents } from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/env';
import logger from '../utils/logger';
import { buildPdfHtml } from '../templates/pdf';
import {
  documentStyles,
  pageSettings,
  getDocumentProperties,
  createCoverPage,
  createTableOfContents,
  parseMarkdownToDocx,
  formatSectionName,
} from '../templates/docx/styles';

const prisma = new PrismaClient();

export class ExportService {
  private storagePath: string;

  constructor() {
    this.storagePath = config.storagePath || './storage/reports';
    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  // Request export generation (creates a job)
  async requestExport(
    reportId: string,
    userId: string,
    format: ReportFormat,
    triggeredBy: ExportTrigger = 'ON_DEMAND'
  ): Promise<DocumentExport> {
    // Verify report exists and belongs to user
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'COMPLETED') {
      throw new Error('Report is not completed yet');
    }

    // Check if export already exists
    const existing = await prisma.documentExport.findUnique({
      where: { reportId_format: { reportId, format } },
    });

    if (existing) {
      // If completed, return existing
      if (existing.status === 'COMPLETED' && existing.filePath) {
        return existing;
      }
      // If failed or expired, reset and retry
      if (existing.status === 'FAILED' || existing.status === 'EXPIRED') {
        return prisma.documentExport.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            error: null,
            retryCount: 0,
            startedAt: null,
            completedAt: null,
            filePath: null,
            fileSize: null,
          },
        });
      }
      // If pending or processing, just return
      return existing;
    }

    // Create new export job
    return prisma.documentExport.create({
      data: {
        reportId,
        format,
        status: 'PENDING',
        triggeredBy,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
      },
    });
  }

  // Get all exports for a report
  async getExports(reportId: string): Promise<DocumentExport[]> {
    return prisma.documentExport.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get single export by ID
  async getExport(exportId: string): Promise<DocumentExport | null> {
    return prisma.documentExport.findUnique({
      where: { id: exportId },
    });
  }

  // Process an export job
  async processExport(exportId: string): Promise<void> {
    const exportJob = await prisma.documentExport.findUnique({
      where: { id: exportId },
      include: { report: true },
    });

    if (!exportJob) {
      throw new Error('Export job not found');
    }

    if (exportJob.status !== 'PENDING') {
      logger.warn(`Export ${exportId} is not pending, skipping`);
      return;
    }

    // Mark as processing
    await prisma.documentExport.update({
      where: { id: exportId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
      let buffer: Buffer;

      if (exportJob.format === 'PDF') {
        buffer = await this.generatePDF(exportJob.report);
      } else {
        buffer = await this.generateDOCX(exportJob.report);
      }

      // Save to file
      const filePath = await this.saveFile(exportJob.reportId, exportJob.format, buffer);

      // Update export record
      await prisma.documentExport.update({
        where: { id: exportId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          filePath,
          fileSize: buffer.length,
        },
      });

      logger.info(`Export ${exportId} completed successfully: ${filePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Export ${exportId} failed:`, error);

      const newRetryCount = exportJob.retryCount + 1;
      const shouldRetry = newRetryCount < exportJob.maxRetries;

      await prisma.documentExport.update({
        where: { id: exportId },
        data: {
          status: shouldRetry ? 'PENDING' : 'FAILED',
          error: errorMessage,
          retryCount: newRetryCount,
          completedAt: shouldRetry ? null : new Date(),
        },
      });

      if (!shouldRetry) {
        throw error;
      }
    }
  }

  // Generate PDF from report
  private async generatePDF(report: Report): Promise<Buffer> {
    const reportData = {
      id: report.id,
      title: report.title,
      workflowType: report.workflowType,
      companyName: (report.inputData as any)?.companyName,
      generatedContent: report.generatedContent as any,
      createdAt: report.createdAt,
      completedAt: report.completedAt || undefined,
    };

    const html = buildPdfHtml(reportData);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '1in', right: '0.75in', bottom: '1in', left: '0.75in' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="width: 100%; font-size: 10px; text-align: center; color: #6B7280; padding: 0 0.75in;">
            <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  // Generate DOCX from report
  private async generateDOCX(report: Report): Promise<Buffer> {
    const inputData = report.inputData as any;
    const generatedContent = report.generatedContent as Record<string, { section: string; content: string; metadata: any }>;

    const children: (Paragraph | TableOfContents)[] = [];

    // Cover page
    children.push(
      ...createCoverPage({
        title: report.title,
        companyName: inputData?.companyName || '',
        workflowType: report.workflowType,
        generatedAt: report.completedAt || report.createdAt,
        reportId: report.id,
      })
    );

    // Table of contents (if more than one section)
    const sections = Object.keys(generatedContent || {});
    if (sections.length > 1) {
      children.push(...createTableOfContents());
    }

    // Sections
    for (const [sectionKey, sectionData] of Object.entries(generatedContent || {})) {
      // Section header
      children.push(
        new Paragraph({
          text: formatSectionName(sectionKey),
          heading: HeadingLevel.HEADING_1,
        })
      );

      // Section content
      const contentParagraphs = parseMarkdownToDocx(sectionData.content);
      children.push(...contentParagraphs);

      // Add spacing between sections
      children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
    }

    // Footer
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated by IIoT Account Intelligence | Report ID: ${report.id}`,
            size: 18,
            color: '9CA3AF',
          }),
        ],
        spacing: { before: 480 },
      })
    );

    const doc = new Document({
      ...getDocumentProperties(report.title, report.workflowType),
      styles: documentStyles,
      sections: [
        {
          ...pageSettings,
          children,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  // Save file to storage
  private async saveFile(reportId: string, format: ReportFormat, buffer: Buffer): Promise<string> {
    const reportDir = path.join(this.storagePath, reportId);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = Date.now();
    const extension = format.toLowerCase();
    const filename = `report-${timestamp}.${extension}`;
    const filePath = path.join(reportDir, filename);

    // Write atomically
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, buffer);
    fs.renameSync(tempPath, filePath);

    return filePath;
  }

  // Get file stream for download
  async getDownloadStream(
    reportId: string,
    format: ReportFormat,
    userId: string
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
    // Verify access
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      return null;
    }

    const exportJob = await prisma.documentExport.findUnique({
      where: { reportId_format: { reportId, format } },
    });

    if (!exportJob || exportJob.status !== 'COMPLETED' || !exportJob.filePath) {
      return null;
    }

    if (!fs.existsSync(exportJob.filePath)) {
      // File was deleted, mark as expired
      await prisma.documentExport.update({
        where: { id: exportJob.id },
        data: { status: 'EXPIRED', filePath: null },
      });
      return null;
    }

    const buffer = fs.readFileSync(exportJob.filePath);
    const extension = format.toLowerCase();
    const safeTitle = report.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const filename = `${safeTitle}.${extension}`;

    const mimeType =
      format === 'PDF'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return { buffer, filename, mimeType };
  }

  // Trigger eager generation for selected formats
  async triggerEagerGeneration(reportId: string, formats: ReportFormat[], userId: string): Promise<void> {
    for (const format of formats) {
      try {
        await this.requestExport(reportId, userId, format, 'EAGER');
        logger.info(`Eager export queued for report ${reportId}: ${format}`);
      } catch (error) {
        logger.error(`Failed to queue eager export for ${reportId}:${format}`, error);
      }
    }
  }

  // Check if export is ready
  async isExportReady(reportId: string, format: ReportFormat): Promise<boolean> {
    const exportJob = await prisma.documentExport.findUnique({
      where: { reportId_format: { reportId, format } },
    });

    return exportJob?.status === 'COMPLETED' && !!exportJob.filePath;
  }

  // Cleanup expired exports
  async cleanupExpiredExports(): Promise<{ deleted: number; errors: number }> {
    let deleted = 0;
    let errors = 0;

    const expiredExports = await prisma.documentExport.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: 'COMPLETED',
        filePath: { not: null },
      },
    });

    for (const exportJob of expiredExports) {
      try {
        if (exportJob.filePath && fs.existsSync(exportJob.filePath)) {
          fs.unlinkSync(exportJob.filePath);
        }

        await prisma.documentExport.update({
          where: { id: exportJob.id },
          data: { status: 'EXPIRED', filePath: null },
        });

        deleted++;
        logger.debug(`Cleaned up expired export: ${exportJob.id}`);
      } catch (error) {
        errors++;
        logger.error(`Failed to cleanup export ${exportJob.id}:`, error);
      }
    }

    return { deleted, errors };
  }
}

// Singleton instance
let exportServiceInstance: ExportService | null = null;

export function getExportService(): ExportService {
  if (!exportServiceInstance) {
    exportServiceInstance = new ExportService();
  }
  return exportServiceInstance;
}

export default ExportService;

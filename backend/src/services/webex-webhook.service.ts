import { PrismaClient, User, WorkflowType } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getLLMService } from './llm.service';
import { getReportService } from './report.service';
import { getWebexDeliveryService } from './webex-delivery.service';
import { getAdminService } from './admin.service';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { reportRequestCard, helpCard, buildReportRequestCard } from '../templates/webex-cards';
import {
  WebexWebhookPayload,
  WebexWebhookMessageData,
  WebexMessage,
  ParsedReportRequest,
  ParseResult,
  isParsedRequest,
  isParseError,
  WebexAttachmentActionPayload,
  CardSubmissionInputs,
} from '../types/webex-webhook.types';

const prisma = new PrismaClient();

/**
 * Rate limiter for webhook requests
 */
class WebhookRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests = 10;
  private readonly windowMs = 60000; // 1 minute

  isRateLimited(email: string): boolean {
    const now = Date.now();
    const key = email.toLowerCase();

    let timestamps = this.requests.get(key) || [];

    // Remove expired timestamps
    timestamps = timestamps.filter(t => now - t < this.windowMs);

    if (timestamps.length >= this.maxRequests) {
      return true;
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);

    return false;
  }

  getRemainingTime(email: string): number {
    const now = Date.now();
    const key = email.toLowerCase();
    const timestamps = this.requests.get(key) || [];

    if (timestamps.length === 0) return 0;

    const oldestTimestamp = Math.min(...timestamps);
    const remainingMs = this.windowMs - (now - oldestTimestamp);

    return Math.max(0, Math.ceil(remainingMs / 1000)); // Return seconds
  }
}

export class WebexWebhookService {
  private rateLimiter = new WebhookRateLimiter();
  private botEmail: string | null = null;

  /**
   * Log Webex interaction to database
   */
  private async logInteraction(data: {
    userEmail: string;
    personId?: string;
    roomId?: string;
    messageText: string;
    messageId?: string;
    workflowType?: string;
    targetCompany?: string;
    additionalData?: any;
    responseType: string;
    responseText?: string;
    reportId?: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<string | null> {
    try {
      const interaction = await prisma.webexInteraction.create({
        data: {
          userEmail: data.userEmail,
          personId: data.personId,
          roomId: data.roomId,
          messageText: data.messageText,
          messageId: data.messageId,
          workflowType: data.workflowType,
          targetCompany: data.targetCompany,
          additionalData: data.additionalData as any,
          responseType: data.responseType,
          responseText: data.responseText,
          reportId: data.reportId,
          success: data.success,
          errorMessage: data.errorMessage,
        },
      });
      return interaction.id;
    } catch (error) {
      logger.error('Failed to log Webex interaction', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return null;
    }
  }

  /**
   * Main entry point for processing webhook payloads
   */
  async processWebhook(payload: WebexWebhookPayload): Promise<void> {
    // Only process message:created events
    if (payload.resource !== 'messages' || payload.event !== 'created') {
      logger.debug('Ignoring non-message webhook event', {
        resource: payload.resource,
        event: payload.event
      });
      return;
    }

    const messageData = payload.data;
    const senderEmail = messageData.personEmail;

    // Filter out bot's own messages to prevent loops
    const botEmail = await this.getBotEmail();
    if (botEmail && senderEmail === botEmail) {
      logger.debug('Ignoring bot own message', { senderEmail });
      return;
    }

    // Security: Cisco email check
    if (!this.isCiscoEmail(senderEmail)) {
      logger.warn('Non-Cisco email rejected', {
        domain: senderEmail.split('@')[1]
      });
      const errorMsg = 'This service is only available for Cisco employees (@cisco.com).';
      await this.sendErrorReply(messageData, errorMsg);
      await this.logInteraction({
        userEmail: senderEmail,
        personId: messageData.personId,
        roomId: messageData.roomType === 'group' ? messageData.roomId : undefined,
        messageText: '[Message not fetched - non-Cisco email]',
        messageId: messageData.id,
        responseType: 'ERROR',
        responseText: errorMsg,
        success: false,
        errorMessage: 'Non-Cisco email domain',
      });
      return;
    }

    // Security: Rate limiting
    if (this.rateLimiter.isRateLimited(senderEmail)) {
      const waitTime = this.rateLimiter.getRemainingTime(senderEmail);
      logger.warn('Webhook rate limit exceeded', {
        domain: senderEmail.split('@')[1]
      });
      const errorMsg = `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`;
      await this.sendErrorReply(messageData, errorMsg);
      await this.logInteraction({
        userEmail: senderEmail,
        personId: messageData.personId,
        roomId: messageData.roomType === 'group' ? messageData.roomId : undefined,
        messageText: '[Message not fetched - rate limited]',
        messageId: messageData.id,
        responseType: 'RATE_LIMITED',
        responseText: errorMsg,
        success: false,
        errorMessage: `Rate limit: ${waitTime}s remaining`,
      });
      return;
    }

    // Fetch full message content (webhook only contains metadata)
    const message = await this.fetchMessageContent(messageData.id);

    if (!message || !message.text) {
      logger.error('Failed to fetch message content', {
        messageId: messageData.id
      });
      return;
    }

    const messageText = message.text.trim().toLowerCase();

    // Card Trigger 1: Help/menu/form commands
    if (/^(help|menu|options|form|show form|build report)$/i.test(messageText)) {
      logger.info('Help command detected, sending help card', { messageText });
      const destination = messageData.roomType === 'direct' ? messageData.personEmail : messageData.roomId;
      const destinationType = messageData.roomType === 'direct' ? 'email' : 'roomId';
      await this.sendHelpCard(destination, destinationType as 'email' | 'roomId');
      await this.logInteraction({
        userEmail: senderEmail,
        personId: messageData.personId,
        roomId: messageData.roomType === 'group' ? messageData.roomId : undefined,
        messageText: message.text,
        messageId: messageData.id,
        responseType: 'HELP_CARD',
        responseText: 'Help card sent',
        success: true,
      });
      return;
    }

    // Parse user request with LLM
    const parsed = await this.parseUserRequest(message.text);

    // Card Trigger 3: Parse error - send report card to help user
    if (isParseError(parsed)) {
      logger.info('Parse error detected, sending report card to assist user', {
        error: parsed.error
      });
      const destination = messageData.roomType === 'direct' ? messageData.personEmail : messageData.roomId;
      const destinationType = messageData.roomType === 'direct' ? 'email' : 'roomId';

      // Send clarification message first
      const clarificationMsg = `I'd be happy to help! ${parsed.error}

You can use the form below to build a custom report, or try something like:
- "Account report for Microsoft"
- "Competitive analysis of Siemens"
- "News digest for Apple, Google, Amazon"`;

      await this.sendClarificationRequest(messageData, clarificationMsg);

      // Then send report card to help them
      await this.sendReportCard(
        destination,
        messageData.personId,
        destinationType as 'email' | 'roomId'
      );

      await this.logInteraction({
        userEmail: senderEmail,
        personId: messageData.personId,
        roomId: messageData.roomType === 'group' ? messageData.roomId : undefined,
        messageText: message.text,
        messageId: messageData.id,
        responseType: 'PARSE_ERROR_CARD',
        responseText: clarificationMsg,
        success: true,
        additionalData: { parseError: parsed.error },
      });
      return;
    }

    // Validate parsed request
    const validation = this.validateParsedRequest(parsed);
    if (!validation.valid) {
      const errorMsg = `Invalid request: ${validation.errors.join(', ')}`;
      await this.sendErrorReply(messageData, errorMsg);
      await this.logInteraction({
        userEmail: senderEmail,
        personId: messageData.personId,
        roomId: messageData.roomType === 'group' ? messageData.roomId : undefined,
        messageText: message.text,
        messageId: messageData.id,
        workflowType: parsed.workflowType,
        targetCompany: parsed.targetCompany,
        additionalData: parsed.additionalCompanies ? { additionalCompanies: parsed.additionalCompanies } : undefined,
        responseType: 'ERROR',
        responseText: errorMsg,
        success: false,
        errorMessage: validation.errors.join(', '),
      });
      return;
    }

    // Validate company name using LLM enrichment
    logger.info('Validating company name', { companyName: parsed.targetCompany });
    const companyValidation = await this.validateCompany(parsed.targetCompany);

    // Card Trigger 2: Low confidence - send prefilled card
    if (parsed.confidence < 0.7) {
      logger.info('Low confidence detected, sending prefilled report card', {
        confidence: parsed.confidence,
        targetCompany: parsed.targetCompany
      });
      const destination = messageData.roomType === 'direct' ? messageData.personEmail : messageData.roomId;
      const destinationType = messageData.roomType === 'direct' ? 'email' : 'roomId';

      // Send prefilled card with what we could parse
      await this.sendReportCard(
        destination,
        messageData.personId,
        destinationType as 'email' | 'roomId',
        {
          companyName: parsed.targetCompany,
          workflowType: parsed.workflowType,
          depth: parsed.depth
        }
      );

      await this.logInteraction({
        userEmail: senderEmail,
        personId: messageData.personId,
        roomId: messageData.roomType === 'group' ? messageData.roomId : undefined,
        messageText: message.text,
        messageId: messageData.id,
        responseType: 'LOW_CONFIDENCE_CARD',
        responseText: 'Report card sent (low confidence)',
        success: true,
        additionalData: { confidence: parsed.confidence },
      });
      return;
    }

    // Block if company validation confidence is too low
    if (companyValidation.confidence < 0.7) {
      const errorMsg = `I couldn't confidently identify the company "${parsed.targetCompany}". ` +
        `Could you please provide a more specific company name or additional details?`;
      await this.sendErrorReply(messageData, errorMsg);
      logger.info('Company validation failed - low confidence', {
        companyName: parsed.targetCompany,
        confidence: companyValidation.confidence
      });
      await this.logInteraction({
        userEmail: senderEmail,
        personId: messageData.personId,
        roomId: messageData.roomType === 'group' ? messageData.roomId : undefined,
        messageText: message.text,
        messageId: messageData.id,
        workflowType: parsed.workflowType,
        targetCompany: parsed.targetCompany,
        additionalData: {
          additionalCompanies: parsed.additionalCompanies,
          confidence: companyValidation.confidence,
        },
        responseType: 'INVALID_COMPANY',
        responseText: errorMsg,
        success: false,
        errorMessage: `Low confidence: ${companyValidation.confidence}`,
      });
      return;
    }

    // Update parsed request with validated company name
    parsed.targetCompany = companyValidation.validatedName;

    logger.info('Company validated successfully', {
      originalName: parsed.targetCompany,
      validatedName: companyValidation.validatedName,
      confidence: companyValidation.confidence,
      industry: companyValidation.industry
    });

    // Find or create user
    const user = await this.findOrCreateCiscoUser(senderEmail);
    if (!user) {
      await this.sendErrorReply(messageData,
        'Failed to process your request. Please try again later.');
      return;
    }

    // Send single acknowledgment with validation details
    await this.sendAcknowledgment(messageData, parsed, companyValidation);

    // Create report
    await this.createReport(user, parsed, messageData);
  }

  /**
   * Check if email is @cisco.com
   */
  private isCiscoEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return false;
    }

    // Strict domain check - only exact @cisco.com match (no subdomains)
    return normalizedEmail.endsWith('@cisco.com') &&
           normalizedEmail.split('@').length === 2;
  }

  /**
   * Get bot's email address (cached after first call)
   */
  private async getBotEmail(): Promise<string | null> {
    if (this.botEmail) {
      return this.botEmail;
    }

    const adminService = getAdminService();
    const settings = await adminService.getSettings();

    if (!settings.webexBotToken) {
      logger.error('Webex bot token not configured');
      return null;
    }

    try {
      const response = await fetch(
        'https://webexapis.com/v1/people/me',
        {
          headers: {
            Authorization: `Bearer ${settings.webexBotToken}`,
          },
        }
      );

      if (!response.ok) {
        logger.error('Failed to fetch bot info from Webex', {
          status: response.status,
          statusText: response.statusText
        });
        return null;
      }

      const data = await response.json() as any;
      this.botEmail = data.emails?.[0] || null;

      logger.info('Bot email cached', { botEmail: this.botEmail });
      return this.botEmail;
    } catch (error) {
      logger.error('Error fetching bot info from Webex', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return null;
    }
  }

  /**
   * Validate company name using LLM enrichment
   */
  private async validateCompany(companyName: string): Promise<{
    validatedName: string;
    confidence: number;
    description: string;
    industry: string;
  }> {
    const llmService = getLLMService();
    const enriched = await llmService.enrichCompanyData(companyName);

    return {
      validatedName: (enriched.validatedName as string) || companyName,
      confidence: (enriched.confidence as number) || 0,
      description: (enriched.description as string) || 'No description available',
      industry: (enriched.industry as string) || 'Unknown',
    };
  }

  /**
   * Fetch full message content from Webex API
   */
  private async fetchMessageContent(messageId: string): Promise<WebexMessage | null> {
    const adminService = getAdminService();
    const settings = await adminService.getSettings();

    if (!settings.webexBotToken) {
      logger.error('Webex bot token not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://webexapis.com/v1/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${settings.webexBotToken}`,
          },
        }
      );

      if (!response.ok) {
        logger.error('Failed to fetch Webex message', {
          status: response.status,
          statusText: response.statusText
        });
        return null;
      }

      const data = await response.json() as WebexMessage;
      return data;
    } catch (error) {
      logger.error('Error fetching Webex message', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return null;
    }
  }

  /**
   * Parse user request using LLM
   */
  private async parseUserRequest(message: string): Promise<ParseResult> {
    const llmService = getLLMService();

    const systemPrompt = `You are an intent parser for the IIoT Account Intelligence platform.
Extract the following from the user's message:
1. targetCompany (required)
2. workflowType: ACCOUNT_INTELLIGENCE (default), COMPETITIVE_INTELLIGENCE, or NEWS_DIGEST
3. additionalCompanies (for NEWS_DIGEST)
4. depth: brief, standard, or detailed

Return ONLY valid JSON matching this schema:
{
  "targetCompany": "string",
  "workflowType": "ACCOUNT_INTELLIGENCE" | "COMPETITIVE_INTELLIGENCE" | "NEWS_DIGEST",
  "additionalCompanies": ["string"] | null,
  "depth": "brief" | "standard" | "detailed",
  "confidence": 0.0-1.0
}

If you cannot extract a valid company name, return: {"error": "reason", "confidence": 0}

Examples:
- "Tell me about Microsoft" -> {"targetCompany": "Microsoft", "workflowType": "ACCOUNT_INTELLIGENCE", "additionalCompanies": null, "depth": "standard", "confidence": 0.95}
- "Competitive analysis of Siemens" -> {"targetCompany": "Siemens", "workflowType": "COMPETITIVE_INTELLIGENCE", "additionalCompanies": null, "depth": "standard", "confidence": 0.90}
- "Brief news digest for Apple, Google, Amazon" -> {"targetCompany": "Apple", "workflowType": "NEWS_DIGEST", "additionalCompanies": ["Google", "Amazon"], "depth": "brief", "confidence": 0.85}`;

    try {
      const response = await llmService.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        maxTokens: 300
      });

      const parsed = JSON.parse(response.content);

      // Set default depth if not provided
      if (isParsedRequest(parsed) && !parsed.depth) {
        parsed.depth = 'standard';
      }

      return parsed;
    } catch (error) {
      logger.error('Failed to parse user request with LLM', {
        error: error instanceof Error ? error.message : 'Unknown',
        message: message.substring(0, 100) // Log first 100 chars only
      });
      return { error: 'Failed to understand your request', confidence: 0 };
    }
  }

  /**
   * Validate parsed request
   */
  private validateParsedRequest(parsed: ParsedReportRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!parsed.targetCompany || parsed.targetCompany.length < 2) {
      errors.push('Company name is too short');
    }
    if (parsed.targetCompany && parsed.targetCompany.length > 200) {
      errors.push('Company name is too long');
    }

    const validWorkflows: WorkflowType[] = ['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST'];
    if (!validWorkflows.includes(parsed.workflowType as WorkflowType)) {
      errors.push('Invalid workflow type');
    }

    if (parsed.depth && !['brief', 'standard', 'detailed'].includes(parsed.depth)) {
      errors.push('Invalid depth option');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Find or create Cisco user
   */
  private async findOrCreateCiscoUser(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (user) {
      if (!user.isActive) {
        logger.warn('Inactive user attempted webhook access', {
          userId: user.id
        });
        return null;
      }
      return user;
    }

    // Auto-create new Cisco user
    try {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 12);

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: 'USER',
          isActive: true,
          profile: {
            create: {
              timezone: 'UTC',
              defaultLLMModel: 'gpt-4',
            }
          }
        }
      });

      logger.info('Auto-created Cisco user via Webex webhook', {
        userId: user.id,
        email: normalizedEmail
      });

      // Send welcome message
      await this.sendWelcomeMessage(normalizedEmail);

      return user;
    } catch (error) {
      logger.error('Failed to auto-create user', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return null;
    }
  }

  /**
   * Send confirmation message (best guess + confirm)
   */
  private async sendConfirmation(
    messageData: WebexWebhookMessageData,
    parsed: ParsedReportRequest,
    companyValidation?: {
      validatedName: string;
      confidence: number;
      description: string;
      industry: string;
    }
  ): Promise<boolean> {
    const webexService = getWebexDeliveryService();

    const workflowLabels: Record<string, string> = {
      ACCOUNT_INTELLIGENCE: 'Account Intelligence',
      COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence',
      NEWS_DIGEST: 'News Digest'
    };

    const workflowLabel = workflowLabels[parsed.workflowType] || parsed.workflowType;

    let message = `I'll generate an **${workflowLabel}** report for **${parsed.targetCompany}**.`;

    // Add validated company info if available
    if (companyValidation) {
      message += `\n\n**Industry:** ${companyValidation.industry}`;
      if (companyValidation.description) {
        message += `\n**About:** ${companyValidation.description}`;
      }
    }

    if (parsed.additionalCompanies && parsed.additionalCompanies.length > 0) {
      message += `\n\nIncluding: ${parsed.additionalCompanies.join(', ')}`;
    }

    message += `\n\nDoes this look right? Reply "yes" to proceed or tell me what to change.`;

    const destination = messageData.roomType === 'direct'
      ? messageData.personEmail
      : messageData.roomId;
    const destinationType = messageData.roomType === 'direct' ? 'email' : 'roomId';

    try {
      await webexService.sendWebexMessage(destination, message, destinationType);

      // For MVP, assume user will confirm (we'll handle "yes" in a future iteration)
      // TODO: Implement conversation state management
      return true; // Simulate confirmation for now
    } catch (error) {
      logger.error('Failed to send confirmation', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return false;
    }
  }

  /**
   * Send acknowledgment message with validation details
   */
  private async sendAcknowledgment(
    messageData: WebexWebhookMessageData,
    parsed: ParsedReportRequest,
    companyValidation?: {
      validatedName: string;
      confidence: number;
      description: string;
      industry: string;
    }
  ): Promise<void> {
    const webexService = getWebexDeliveryService();

    const workflowLabels: Record<string, string> = {
      ACCOUNT_INTELLIGENCE: 'Account Intelligence',
      COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence',
      NEWS_DIGEST: 'News Digest'
    };

    const workflowLabel = workflowLabels[parsed.workflowType] || parsed.workflowType;

    let message = `Generating **${workflowLabel}** report for **${parsed.targetCompany}**.`;

    // Add validated company info if available
    if (companyValidation) {
      message += `\n\n**Industry:** ${companyValidation.industry}`;
      if (companyValidation.description) {
        message += `\n**About:** ${companyValidation.description}`;
      }
    }

    if (parsed.additionalCompanies && parsed.additionalCompanies.length > 0) {
      message += `\n\nIncluding: ${parsed.additionalCompanies.join(', ')}`;
    }

    message += `\n\nI'll send it when ready (2-3 minutes).`;

    const destination = messageData.roomType === 'direct'
      ? messageData.personEmail
      : messageData.roomId;
    const destinationType = messageData.roomType === 'direct' ? 'email' : 'roomId';

    try {
      await webexService.sendWebexMessage(destination, message, destinationType);
    } catch (error) {
      logger.error('Failed to send acknowledgment', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }
  }

  /**
   * Send error reply
   */
  private async sendErrorReply(
    messageData: WebexWebhookMessageData,
    errorMessage: string
  ): Promise<void> {
    const webexService = getWebexDeliveryService();

    const destination = messageData.roomType === 'direct'
      ? messageData.personEmail
      : messageData.roomId;
    const destinationType = messageData.roomType === 'direct' ? 'email' : 'roomId';

    try {
      await webexService.sendWebexMessage(destination, errorMessage, destinationType);
    } catch (error) {
      logger.error('Failed to send error reply', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }
  }

  /**
   * Send clarification request
   */
  private async sendClarificationRequest(
    messageData: WebexWebhookMessageData,
    errorReason: string
  ): Promise<void> {
    const message = `I'd be happy to help! ${errorReason}

Try something like:
- "Account report for Microsoft"
- "Competitive analysis of Siemens"
- "News digest for Apple, Google, Amazon"`;

    await this.sendErrorReply(messageData, message);
  }

  /**
   * Send welcome message to new user
   */
  private async sendWelcomeMessage(email: string): Promise<void> {
    const webexService = getWebexDeliveryService();

    const frontendUrl = config.frontendUrl || 'http://localhost:4000';

    const message = `**Welcome to IIoT Account Intelligence!**

I've created an account for you using your Cisco email.

You can now:
- Request reports by @mentioning me in any Webex space
- View your reports at: ${frontendUrl}/dashboard

Your first report is being generated now!`;

    try {
      await webexService.sendWebexMessage(email, message, 'email');
    } catch (error) {
      logger.error('Failed to send welcome message', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }
  }

  /**
   * Create report
   */
  private async createReport(
    user: User,
    parsed: ParsedReportRequest,
    messageData: WebexWebhookMessageData
  ): Promise<void> {
    const reportService = getReportService();

    const workflowLabels: Record<string, string> = {
      ACCOUNT_INTELLIGENCE: 'Account Intelligence',
      COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence',
      NEWS_DIGEST: 'News Digest'
    };

    const workflowLabel = workflowLabels[parsed.workflowType] || parsed.workflowType;

    // Get message text for logging (should have been fetched already in processWebhook)
    const message = await this.fetchMessageContent(messageData.id);
    const messageText = message?.text || '[Message text not available]';

    try {
      const report = await reportService.createReport({
        userId: user.id,
        title: `${parsed.targetCompany} - ${workflowLabel}`,
        workflowType: parsed.workflowType as WorkflowType,
        inputData: {
          companyName: parsed.targetCompany,
          companyNames: parsed.additionalCompanies,
        },
        depth: parsed.depth || 'standard',
        requestedFormats: ['PDF'], // Request PDF generation for attachment
        delivery: {
          method: 'WEBEX',
          destination: messageData.roomType === 'direct'
            ? messageData.personEmail
            : messageData.roomId,
          destinationType: messageData.roomType === 'direct' ? 'email' : 'roomId',
          contentType: 'ATTACHMENT', // Changed from SUMMARY_LINK to include PDF attachment
        }
      });

      logger.info('Report created from Webex webhook', {
        reportId: report.id,
        workflowType: parsed.workflowType,
        userId: user.id
      });

      // Log successful interaction
      const acknowledgmentMsg = `Generating **${workflowLabel}** report for **${parsed.targetCompany}**. I'll send it when ready (2-3 minutes).`;
      await this.logInteraction({
        userEmail: messageData.personEmail,
        personId: messageData.personId,
        roomId: messageData.roomType === 'group' ? messageData.roomId : undefined,
        messageText,
        messageId: messageData.id,
        workflowType: parsed.workflowType,
        targetCompany: parsed.targetCompany,
        additionalData: {
          additionalCompanies: parsed.additionalCompanies,
          depth: parsed.depth,
        },
        responseType: 'REPORT_CREATED',
        responseText: acknowledgmentMsg,
        reportId: report.id,
        success: true,
      });
    } catch (error) {
      logger.error('Failed to create report from webhook', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      const errorMsg = 'Failed to create your report. Please try again later.';
      await this.sendErrorReply(messageData, errorMsg);

      // Log failed interaction
      await this.logInteraction({
        userEmail: messageData.personEmail,
        personId: messageData.personId,
        roomId: messageData.roomType === 'group' ? messageData.roomId : undefined,
        messageText,
        messageId: messageData.id,
        workflowType: parsed.workflowType,
        targetCompany: parsed.targetCompany,
        additionalData: {
          additionalCompanies: parsed.additionalCompanies,
          depth: parsed.depth,
        },
        responseType: 'ERROR',
        responseText: errorMsg,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Process Webex card action (form submission)
   */
  async processCardAction(payload: WebexAttachmentActionPayload): Promise<void> {
    try {
      // Fetch the action details to get form inputs
      const webexService = getWebexDeliveryService();
      const actionDetails = await webexService.getAttachmentAction(payload.data.id);

      logger.info('Processing card action', {
        actionId: payload.data.id,
        action: actionDetails.inputs.action,
        companyName: actionDetails.inputs.companyName,
        workflowType: actionDetails.inputs.workflowType
      });

      // Handle cancel action
      if (actionDetails.inputs.action === 'cancel') {
        logger.debug('Card action cancelled by user');
        return;
      }

      // Handle showReportForm action (from help card)
      if (actionDetails.inputs.action === 'showReportForm') {
        await this.sendReportCard(payload.data.roomId, payload.data.personId, 'roomId');
        return;
      }

      // Handle createReport action
      if (actionDetails.inputs.action === 'createReport') {
        await this.handleCardReportRequest(actionDetails.inputs, payload.data.roomId, payload.data.personId);
        return;
      }

      logger.warn('Unknown card action', { action: actionDetails.inputs.action });

    } catch (error) {
      logger.error('Failed to process card action', {
        error: error instanceof Error ? error.message : 'Unknown',
        actionId: payload.data.id,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Handle report request from card submission
   */
  private async handleCardReportRequest(
    inputs: CardSubmissionInputs,
    roomId: string,
    personId: string
  ): Promise<void> {
    try {
      // Validate required fields
      if (!inputs.companyName) {
        logger.warn('Card submission missing company name');
        return;
      }

      // Get or create user based on personId
      const message = await this.getMessageByPersonId(personId);
      if (!message) {
        logger.error('Could not get person email from personId');
        return;
      }

      const user = await this.ensureUserExists(message.personEmail);

      // Parse output formats (multi-select returns comma-separated string)
      const outputFormatsStr = inputs.outputFormats || 'PDF';
      const outputFormats = outputFormatsStr.split(',').map(f => f.trim());

      // Build message data for existing methods
      const messageData: WebexWebhookMessageData = {
        id: message.id,
        roomId,
        roomType: 'direct', // Assume direct for now
        personId,
        personEmail: message.personEmail,
        created: new Date().toISOString(),
        text: `Report request via card for ${inputs.companyName}`
      };

      // Process each requested format
      for (const format of outputFormats) {
        if (format === 'PDF' || format === 'DOCX') {
          // Create document report
          await this.createDocumentReport(user, inputs, messageData, format as 'PDF' | 'DOCX');
        } else if (format === 'PODCAST') {
          // Create podcast report
          await this.createPodcastReport(user, inputs, messageData);
        }
      }

    } catch (error) {
      logger.error('Failed to handle card report request', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }
  }

  /**
   * Create document report (PDF or DOCX) from card inputs
   */
  private async createDocumentReport(
    user: User,
    inputs: CardSubmissionInputs,
    messageData: WebexWebhookMessageData,
    format: 'PDF' | 'DOCX'
  ): Promise<void> {
    const reportService = getReportService();
    const workflowType = (inputs.workflowType || 'ACCOUNT_INTELLIGENCE') as WorkflowType;
    const depth = inputs.depth || 'standard';
    const additionalCompanies = inputs.additionalCompanies
      ? inputs.additionalCompanies.split(',').map(c => c.trim())
      : undefined;

    const workflowLabel = {
      ACCOUNT_INTELLIGENCE: 'Account Intelligence',
      COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence',
      NEWS_DIGEST: 'News Digest'
    }[workflowType];

    const report = await reportService.createReport({
      userId: user.id,
      title: `${inputs.companyName} - ${workflowLabel}`,
      workflowType,
      inputData: {
        companyName: inputs.companyName!,
        companyNames: additionalCompanies,
      },
      depth: depth as 'brief' | 'standard' | 'detailed',
      requestedFormats: [format],
      delivery: {
        method: 'WEBEX',
        destination: messageData.personEmail,
        destinationType: 'email',
        contentType: 'ATTACHMENT',
        format,
      },
    });

    // Send acknowledgment
    const acknowledgmentMsg = `Creating ${workflowLabel} report for **${inputs.companyName}** (${format} format). I'll send it when ready (2-3 minutes).`;
    await this.sendAcknowledgment(messageData, acknowledgmentMsg);

    logger.info('Document report created from card', {
      reportId: report.id,
      companyName: inputs.companyName,
      workflowType,
      format
    });
  }

  /**
   * Create podcast report from card inputs
   */
  private async createPodcastReport(
    user: User,
    inputs: CardSubmissionInputs,
    messageData: WebexWebhookMessageData
  ): Promise<void> {
    const reportService = getReportService();
    const workflowType = (inputs.workflowType || 'ACCOUNT_INTELLIGENCE') as WorkflowType;
    const depth = inputs.depth || 'standard';
    const additionalCompanies = inputs.additionalCompanies
      ? inputs.additionalCompanies.split(',').map(c => c.trim())
      : undefined;

    const podcastTemplate = inputs.podcastTemplate || 'EXECUTIVE_BRIEF';
    const podcastDuration = inputs.podcastDuration || 'STANDARD';

    const workflowLabel = {
      ACCOUNT_INTELLIGENCE: 'Account Intelligence',
      COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence',
      NEWS_DIGEST: 'News Digest'
    }[workflowType];

    const report = await reportService.createReport({
      userId: user.id,
      title: `${inputs.companyName} - ${workflowLabel} Podcast`,
      workflowType,
      inputData: {
        companyName: inputs.companyName!,
        companyNames: additionalCompanies,
      },
      depth: depth as 'brief' | 'standard' | 'detailed',
      requestedFormats: ['PDF'], // Base report for podcast
      podcastOptions: {
        template: podcastTemplate as any,
        duration: podcastDuration as any,
        deliveryEnabled: true,
        deliveryDestination: messageData.personEmail,
        deliveryDestinationType: 'email',
      },
    });

    // Send acknowledgment
    const durationLabels = { SHORT: '5 minute', STANDARD: '12 minute', LONG: '18 minute' };
    const templateLabels = {
      EXECUTIVE_BRIEF: 'Executive Brief',
      STRATEGIC_DEBATE: 'Strategic Debate',
      INDUSTRY_PULSE: 'Industry Pulse'
    };
    const acknowledgmentMsg = `Creating ${durationLabels[podcastDuration as keyof typeof durationLabels]} ${templateLabels[podcastTemplate as keyof typeof templateLabels]} podcast for **${inputs.companyName}**. I'll send the audio when ready (5-8 minutes).`;
    await this.sendAcknowledgment(messageData, acknowledgmentMsg);

    logger.info('Podcast report created from card', {
      reportId: report.id,
      companyName: inputs.companyName,
      workflowType,
      podcastTemplate,
      podcastDuration
    });
  }

  /**
   * Get person details by person ID from Webex API
   */
  private async getMessageByPersonId(personId: string): Promise<WebexMessage | null> {
    try {
      const adminService = getAdminService();
      const settings = await adminService.getSettings();

      if (!settings.webexBotToken) {
        logger.error('Webex bot token not configured');
        return null;
      }

      // Fetch person details from Webex API
      const response = await fetch(`https://webexapis.com/v1/people/${personId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${settings.webexBotToken}`,
        },
      });

      if (!response.ok) {
        logger.error('Failed to fetch person details from Webex', {
          personId,
          status: response.status
        });
        return null;
      }

      const person = await response.json();

      // Return a mock WebexMessage with the person's email
      return {
        id: crypto.randomBytes(16).toString('hex'),
        roomId: '',
        roomType: 'direct',
        text: '',
        personId,
        personEmail: person.emails[0],
        created: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get message by person ID', { error });
      return null;
    }
  }

  /**
   * Send report request card to user
   */
  async sendReportCard(
    destination: string,
    personId: string,
    destinationType: 'email' | 'roomId',
    prefill?: { companyName?: string; workflowType?: string; depth?: string }
  ): Promise<void> {
    const webexService = getWebexDeliveryService();
    const card = prefill ? buildReportRequestCard(prefill) : reportRequestCard;

    await webexService.sendCardMessage(
      destination,
      destinationType,
      card,
      'Use the form to create a custom report'
    );

    logger.info('Report request card sent', { destination, destinationType });
  }

  /**
   * Send help card to user
   */
  async sendHelpCard(
    destination: string,
    destinationType: 'email' | 'roomId'
  ): Promise<void> {
    const webexService = getWebexDeliveryService();

    await webexService.sendCardMessage(
      destination,
      destinationType,
      helpCard,
      'IIoT Account Intelligence Bot - Type "help" for assistance'
    );

    logger.info('Help card sent', { destination, destinationType });
  }
}

// Singleton instance
let webhookServiceInstance: WebexWebhookService | null = null;

export function getWebexWebhookService(): WebexWebhookService {
  if (!webhookServiceInstance) {
    webhookServiceInstance = new WebexWebhookService();
  }
  return webhookServiceInstance;
}

export default WebexWebhookService;

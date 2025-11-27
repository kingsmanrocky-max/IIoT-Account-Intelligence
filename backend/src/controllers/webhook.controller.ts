import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { getAdminService } from '../services/admin.service';
import { getWebexWebhookService } from '../services/webex-webhook.service';
import { logger } from '../utils/logger';
import { WebexWebhookPayload } from '../types/webex-webhook.types';

export class WebhookController {

  /**
   * Validate Webex webhook signature using HMAC-SHA1
   */
  async validateSignature(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const signature = request.headers['x-spark-signature'] as string;

    if (!signature) {
      logger.warn('Webex webhook missing signature', {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
      return reply.status(401).send({ error: 'Missing signature' });
    }

    // Get webhook secret from admin settings
    const adminService = getAdminService();
    const settings = await adminService.getSettings();

    if (!settings.webexWebhookSecret) {
      logger.error('Webex webhook secret not configured');
      return reply.status(500).send({ error: 'Webhook not configured' });
    }

    // Get raw body for signature validation
    const rawBody = (request as any).rawBody as Buffer;

    if (!rawBody) {
      logger.error('Raw body not available for signature validation');
      return reply.status(500).send({ error: 'Configuration error' });
    }

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha1', settings.webexWebhookSecret)
      .update(rawBody)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    try {
      const sigBuffer = Buffer.from(signature, 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

      if (sigBuffer.length !== expectedBuffer.length ||
          !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        throw new Error('Signature mismatch');
      }
    } catch (error) {
      logger.warn('Webex webhook signature validation failed', {
        ip: request.ip,
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    logger.debug('Webex webhook signature validated successfully');
  }

  /**
   * Handle incoming Webex webhook
   */
  async handleWebexWebhook(
    request: FastifyRequest<{ Body: WebexWebhookPayload }>,
    reply: FastifyReply
  ) {
    const startTime = Date.now();

    try {
      const payload = request.body;

      logger.info('Webex webhook received', {
        webhookId: payload.id,
        resource: payload.resource,
        event: payload.event,
        personEmail: payload.data.personEmail
      });

      // Process asynchronously - don't block the response
      const webhookService = getWebexWebhookService();
      webhookService.processWebhook(payload).catch(error => {
        logger.error('Webhook processing failed', {
          error: error instanceof Error ? error.message : 'Unknown',
          webhookId: payload.id,
          stack: error instanceof Error ? error.stack : undefined
        });
      });

      // Always return 200 quickly to Webex to prevent retries
      const duration = Date.now() - startTime;
      logger.debug('Webhook response sent', { duration });

      return reply.status(200).send({ received: true });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Webhook handler error', {
        error: error instanceof Error ? error.message : 'Unknown',
        duration,
        stack: error instanceof Error ? error.stack : undefined
      });

      // Still return 200 to prevent Webex from retrying
      return reply.status(200).send({ received: true, processed: false });
    }
  }
}

export default new WebhookController();

import { FastifyInstance } from 'fastify';
import webhookController from '../controllers/webhook.controller';

export default async function webhookRoutes(fastify: FastifyInstance) {
  // Configure raw body parsing for signature validation
  // This parser preserves the raw body in request.rawBody while also parsing JSON
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body: Buffer, done) => {
      // Store raw body for signature validation
      (req as any).rawBody = body;

      try {
        const json = JSON.parse(body.toString('utf8'));
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // Webex webhook endpoint - NO auth middleware (uses signature validation instead)
  fastify.post('/webex', {
    preHandler: webhookController.validateSignature.bind(webhookController),
  }, webhookController.handleWebexWebhook.bind(webhookController));
}

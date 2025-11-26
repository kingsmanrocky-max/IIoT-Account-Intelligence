import { createApp } from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './models';
import { getExportProcessor } from './services/export-processor';
import { getDeliveryProcessor } from './services/delivery-processor';
import { getScheduleProcessor } from './services/schedule-processor';
import { getCleanupProcessor } from './services/cleanup-processor';
import { getPodcastProcessor } from './services/podcast-processor';

async function start() {
  try {
    logger.info('Starting IIoT Account Intelligence API...');
    logger.info(`Environment: ${config.node_env}`);
    logger.info(`Port: ${config.port}`);

    // Test database connection
    await prisma.$connect();
    logger.info('✓ Database connected successfully');

    // Create Fastify app
    const app = await createApp();

    // Start server
    await app.listen({
      port: config.port,
      host: '0.0.0.0', // Listen on all interfaces
    });

    logger.info(`✓ Server listening on http://localhost:${config.port}`);
    logger.info(`✓ API available at http://localhost:${config.port}/api`);
    logger.info(`✓ Health check: http://localhost:${config.port}/health`);

    // Start export processor for background document generation
    const exportProcessor = getExportProcessor();
    exportProcessor.start();
    logger.info('✓ Export processor started');

    // Start delivery processor for background Webex deliveries
    const deliveryProcessor = getDeliveryProcessor();
    deliveryProcessor.start();
    logger.info('✓ Delivery processor started');

    // Start schedule processor for scheduled report generation
    const scheduleProcessor = getScheduleProcessor();
    scheduleProcessor.start();
    logger.info('✓ Schedule processor started');

    // Start cleanup processor for data retention
    const cleanupProcessor = getCleanupProcessor();
    cleanupProcessor.start();
    logger.info('✓ Cleanup processor started');

    // Start podcast processor for podcast generation
    const podcastProcessor = getPodcastProcessor();
    podcastProcessor.start();
    logger.info('✓ Podcast processor started');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      try {
        // Stop processors first to allow pending jobs to complete
        await exportProcessor.stop();
        logger.info('✓ Export processor stopped');

        await deliveryProcessor.stop();
        logger.info('✓ Delivery processor stopped');

        await scheduleProcessor.stop();
        logger.info('✓ Schedule processor stopped');

        await cleanupProcessor.stop();
        logger.info('✓ Cleanup processor stopped');

        await podcastProcessor.stop();
        logger.info('✓ Podcast processor stopped');

        await app.close();
        logger.info('✓ Server closed');

        await prisma.$disconnect();
        logger.info('✓ Database disconnected');

        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the application
start();

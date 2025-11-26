// Podcast Controller - Handles HTTP requests for podcast generation

import { FastifyRequest, FastifyReply } from 'fastify';
import { PodcastTemplate, PodcastDuration } from '@prisma/client';
import { getPodcastService } from '../services/podcast.service';
import { getPodcastProcessor } from '../services/podcast-processor';
import logger from '../utils/logger';
import * as fs from 'fs';

interface RequestPodcastBody {
  template: PodcastTemplate;
  duration: PodcastDuration;
  deliveryEnabled?: boolean;
  deliveryDestination?: string;
  deliveryDestinationType?: 'email' | 'roomId';
}

interface ReportIdParams {
  reportId: string;
}

interface CostEstimateQuery {
  duration: PodcastDuration;
}

// Template information for frontend
const PODCAST_TEMPLATES = [
  {
    id: 'EXECUTIVE_BRIEF',
    name: 'Executive Brief',
    description: 'Professional two-host discussion delivering key insights in an authoritative yet accessible format',
    hosts: [
      { name: 'Sarah', role: 'Senior Analyst', voice: 'nova' },
      { name: 'Marcus', role: 'Industry Expert', voice: 'echo' },
    ],
    durations: ['SHORT', 'STANDARD', 'LONG'],
    bestFor: ['Account Intelligence', 'Competitive Intelligence'],
  },
  {
    id: 'STRATEGIC_DEBATE',
    name: 'Strategic Debate',
    description: 'Dynamic three-host format with contrasting viewpoints and balanced moderation',
    hosts: [
      { name: 'Jordan', role: 'Moderator', voice: 'shimmer' },
      { name: 'Morgan', role: 'Strategist', voice: 'onyx' },
      { name: 'Taylor', role: 'Market Analyst', voice: 'fable' },
    ],
    durations: ['STANDARD', 'LONG'],
    bestFor: ['Competitive Intelligence', 'Strategic Analysis'],
  },
  {
    id: 'INDUSTRY_PULSE',
    name: 'Industry Pulse',
    description: 'Fast-paced news show format covering multiple topics with quick analysis',
    hosts: [
      { name: 'Riley', role: 'News Anchor', voice: 'nova' },
      { name: 'Casey', role: 'Field Reporter', voice: 'echo' },
      { name: 'Drew', role: 'Quick Analyst', voice: 'alloy' },
    ],
    durations: ['SHORT', 'STANDARD'],
    bestFor: ['News Digest', 'Market Updates'],
  },
];

// Duration information
const DURATION_INFO = {
  SHORT: { minutes: 5, description: 'Quick summary (~5 minutes)', wordCount: 775 },
  STANDARD: { minutes: 12, description: 'Comprehensive coverage (~12 minutes)', wordCount: 1860 },
  LONG: { minutes: 18, description: 'In-depth analysis (~18 minutes)', wordCount: 2790 },
};

export class PodcastController {
  private podcastService = getPodcastService();
  private processor = getPodcastProcessor();

  // Request podcast generation for a report
  async requestPodcast(
    request: FastifyRequest<{ Params: ReportIdParams; Body: RequestPodcastBody }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { reportId } = request.params;
      const { template, duration } = request.body;

      // Validate template
      if (!['EXECUTIVE_BRIEF', 'STRATEGIC_DEBATE', 'INDUSTRY_PULSE'].includes(template)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_TEMPLATE',
            message: 'Invalid podcast template',
          },
        });
      }

      // Validate duration
      if (!['SHORT', 'STANDARD', 'LONG'].includes(duration)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_DURATION',
            message: 'Invalid podcast duration',
          },
        });
      }

      const { deliveryEnabled, deliveryDestination, deliveryDestinationType } = request.body;

      const podcast = await this.podcastService.requestPodcast({
        reportId,
        userId,
        template,
        duration,
        deliveryEnabled,
        deliveryDestination,
        deliveryDestinationType,
      });

      logger.info(`Podcast requested by user ${userId}: ${podcast.id} for report ${reportId}${deliveryEnabled ? ` with delivery to ${deliveryDestination}` : ''}`);

      return reply.status(201).send({
        success: true,
        data: {
          id: podcast.id,
          reportId: podcast.reportId,
          template: podcast.template,
          duration: podcast.duration,
          status: podcast.status,
          estimatedCost: podcast.estimatedCost,
          createdAt: podcast.createdAt,
        },
        message: 'Podcast generation queued',
      });
    } catch (error) {
      logger.error('Request podcast error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'REQUEST_PODCAST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to request podcast',
        },
      });
    }
  }

  // Get podcast status
  async getPodcastStatus(
    request: FastifyRequest<{ Params: ReportIdParams }>,
    reply: FastifyReply
  ) {
    try {
      const { reportId } = request.params;

      const status = await this.podcastService.getPodcastStatus(reportId);

      return reply.send({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Get podcast status error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'GET_STATUS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get podcast status',
        },
      });
    }
  }

  // Get podcast details
  async getPodcast(
    request: FastifyRequest<{ Params: ReportIdParams }>,
    reply: FastifyReply
  ) {
    try {
      const { reportId } = request.params;

      const podcast = await this.podcastService.getPodcastByReportId(reportId);

      if (!podcast) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Podcast not found for this report',
          },
        });
      }

      return reply.send({
        success: true,
        data: {
          id: podcast.id,
          reportId: podcast.reportId,
          template: podcast.template,
          duration: podcast.duration,
          status: podcast.status,
          durationSeconds: podcast.durationSeconds,
          fileSizeBytes: podcast.fileSizeBytes ? Number(podcast.fileSizeBytes) : null,
          estimatedCost: podcast.estimatedCost,
          error: podcast.error,
          createdAt: podcast.createdAt,
          completedAt: podcast.completedAt,
          expiresAt: podcast.expiresAt,
        },
      });
    } catch (error) {
      logger.error('Get podcast error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'GET_PODCAST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get podcast',
        },
      });
    }
  }

  // Download podcast audio file
  async downloadPodcast(
    request: FastifyRequest<{ Params: ReportIdParams }>,
    reply: FastifyReply
  ) {
    try {
      const { reportId } = request.params;

      const podcast = await this.podcastService.getPodcastByReportId(reportId);

      if (!podcast) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Podcast not found for this report',
          },
        });
      }

      if (podcast.status !== 'COMPLETED') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NOT_READY',
            message: `Podcast is not ready. Current status: ${podcast.status}`,
          },
        });
      }

      if (!podcast.finalAudioPath || !fs.existsSync(podcast.finalAudioPath)) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Podcast audio file not found',
          },
        });
      }

      const filename = `podcast_${reportId.substring(0, 8)}.mp3`;
      const fileBuffer = fs.readFileSync(podcast.finalAudioPath);

      return reply
        .header('Content-Type', 'audio/mpeg')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } catch (error) {
      logger.error('Download podcast error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to download podcast',
        },
      });
    }
  }

  // Stream podcast audio with HTTP Range support
  async streamPodcast(
    request: FastifyRequest<{ Params: ReportIdParams }>,
    reply: FastifyReply
  ) {
    try {
      const { reportId } = request.params;

      const podcast = await this.podcastService.getPodcastByReportId(reportId);

      if (!podcast) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Podcast not found for this report',
          },
        });
      }

      if (podcast.status !== 'COMPLETED') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NOT_READY',
            message: `Podcast is not ready. Current status: ${podcast.status}`,
          },
        });
      }

      if (!podcast.finalAudioPath || !fs.existsSync(podcast.finalAudioPath)) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Podcast audio file not found',
          },
        });
      }

      const stat = fs.statSync(podcast.finalAudioPath);
      const fileSize = stat.size;
      const range = request.headers.range;

      if (range) {
        // Parse Range header and return 206 Partial Content
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const stream = fs.createReadStream(podcast.finalAudioPath, { start, end });

        return reply
          .status(206)
          .header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
          .header('Accept-Ranges', 'bytes')
          .header('Content-Length', chunkSize)
          .header('Content-Type', 'audio/mpeg')
          .send(stream);
      } else {
        // No range - stream full file
        const stream = fs.createReadStream(podcast.finalAudioPath);

        return reply
          .status(200)
          .header('Content-Length', fileSize)
          .header('Content-Type', 'audio/mpeg')
          .header('Accept-Ranges', 'bytes')
          .send(stream);
      }
    } catch (error) {
      logger.error('Stream podcast error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'STREAM_FAILED',
          message: error instanceof Error ? error.message : 'Failed to stream podcast',
        },
      });
    }
  }

  // Delete podcast
  async deletePodcast(
    request: FastifyRequest<{ Params: ReportIdParams }>,
    reply: FastifyReply
  ) {
    try {
      const { reportId } = request.params;

      const podcast = await this.podcastService.getPodcastByReportId(reportId);

      if (!podcast) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Podcast not found for this report',
          },
        });
      }

      await this.podcastService.deletePodcast(podcast.id);

      logger.info(`Podcast deleted: ${podcast.id} for report ${reportId}`);

      return reply.send({
        success: true,
        message: 'Podcast deleted successfully',
      });
    } catch (error) {
      logger.error('Delete podcast error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete podcast',
        },
      });
    }
  }

  // Get cost estimate
  async getCostEstimate(
    request: FastifyRequest<{ Querystring: CostEstimateQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { duration } = request.query;

      if (!['SHORT', 'STANDARD', 'LONG'].includes(duration)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_DURATION',
            message: 'Invalid duration. Must be SHORT, STANDARD, or LONG',
          },
        });
      }

      const estimate = this.podcastService.estimateCost(duration as PodcastDuration);
      const durationInfo = DURATION_INFO[duration as keyof typeof DURATION_INFO];

      return reply.send({
        success: true,
        data: {
          ...estimate,
          duration: {
            type: duration,
            ...durationInfo,
          },
        },
      });
    } catch (error) {
      logger.error('Get cost estimate error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'ESTIMATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get cost estimate',
        },
      });
    }
  }

  // Get available templates
  async getTemplates(_request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.send({
        success: true,
        data: {
          templates: PODCAST_TEMPLATES,
          durations: DURATION_INFO,
        },
      });
    } catch (error) {
      logger.error('Get templates error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'GET_TEMPLATES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get templates',
        },
      });
    }
  }

  // Admin: Get processor status
  async getProcessorStatus(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const status = this.processor.getStatus();

      return reply.send({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Get processor status error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'STATUS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get processor status',
        },
      });
    }
  }

  // Admin: Get queue statistics
  async getQueueStats(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await this.processor.getQueueStats();

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get queue stats error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get queue stats',
        },
      });
    }
  }

  // Admin: Test TTS connection
  async testTTS(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const connected = await this.podcastService.testTTSConnection();

      return reply.send({
        success: true,
        data: {
          connected,
          message: connected ? 'TTS service is available' : 'TTS service is not available',
        },
      });
    } catch (error) {
      logger.error('Test TTS error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'TEST_TTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to test TTS connection',
        },
      });
    }
  }

  // Admin: Test FFmpeg availability
  async testFFmpeg(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const available = await this.podcastService.checkFFmpegAvailable();

      return reply.send({
        success: true,
        data: {
          available,
          message: available ? 'FFmpeg is available' : 'FFmpeg is not available',
        },
      });
    } catch (error) {
      logger.error('Test FFmpeg error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'TEST_FFMPEG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to test FFmpeg',
        },
      });
    }
  }

  // Podcast Delivery Methods

  async schedulePodcastDelivery(
    request: FastifyRequest<{
      Params: ReportIdParams;
      Body: { destination: string; destinationType: 'email' | 'roomId' };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { reportId } = request.params;
      const { destination, destinationType } = request.body;
      const userId = (request.user as any).userId;

      // Verify podcast exists and is completed
      const podcast = await this.podcastService.getPodcastByReportId(reportId);
      if (!podcast) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Podcast not found' },
        });
      }

      if (podcast.status !== 'COMPLETED') {
        return reply.status(400).send({
          success: false,
          error: { code: 'NOT_READY', message: 'Podcast is not ready for delivery' },
        });
      }

      if (!podcast.finalAudioPath) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_AUDIO', message: 'Podcast audio file not found' },
        });
      }

      // Schedule delivery
      const delivery = await webexDeliveryService.schedulePodcastDelivery(
        podcast.id,
        userId,
        { destination, destinationType }
      );

      logger.info(`Podcast delivery scheduled: ${delivery.id} for podcast ${podcast.id}`);

      return reply.status(201).send({
        success: true,
        data: delivery,
        message: 'Podcast delivery scheduled successfully',
      });
    } catch (error) {
      logger.error('Schedule podcast delivery error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SCHEDULE_DELIVERY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to schedule podcast delivery',
        },
      });
    }
  }

  async getPodcastDeliveries(
    request: FastifyRequest<{ Params: ReportIdParams }>,
    reply: FastifyReply
  ) {
    try {
      const { reportId } = request.params;

      // Verify podcast exists
      const podcast = await this.podcastService.getPodcastByReportId(reportId);
      if (!podcast) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Podcast not found' },
        });
      }

      // Get deliveries
      const deliveries = await webexDeliveryService.getPodcastDeliveries(podcast.id);

      return reply.status(200).send({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      logger.error('Get podcast deliveries error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'GET_DELIVERIES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve podcast deliveries',
        },
      });
    }
  }

  async retryPodcastDelivery(
    request: FastifyRequest<{ Params: { deliveryId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { deliveryId } = request.params;

      // Retry delivery
      const delivery = await webexDeliveryService.retryPodcastDelivery(deliveryId);

      logger.info(`Podcast delivery retry initiated: ${deliveryId}`);

      return reply.status(200).send({
        success: true,
        data: delivery,
        message: 'Podcast delivery retry initiated',
      });
    } catch (error) {
      logger.error('Retry podcast delivery error:', error);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Delivery not found' },
          });
        }
        if (error.message.includes('cannot be retried')) {
          return reply.status(400).send({
            success: false,
            error: { code: 'CANNOT_RETRY', message: error.message },
          });
        }
        if (error.message.includes('max retries')) {
          return reply.status(400).send({
            success: false,
            error: { code: 'MAX_RETRIES', message: error.message },
          });
        }
      }

      return reply.status(500).send({
        success: false,
        error: {
          code: 'RETRY_DELIVERY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retry podcast delivery',
        },
      });
    }
  }
}

// Singleton instance
const podcastController = new PodcastController();
export default podcastController;

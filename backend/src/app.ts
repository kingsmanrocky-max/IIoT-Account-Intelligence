import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/env';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import reportRoutes from './routes/report.routes';
import adminRoutes from './routes/admin.routes';
import { templateRoutes } from './routes/template.routes';
import { scheduleRoutes } from './routes/schedule.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { podcastRoutes } from './routes/podcast.routes';
import { promptRoutes } from './routes/prompt.routes';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Using custom Winston logger
    trustProxy: true,
    bodyLimit: config.maxFileSize,
  });

  // Register CORS - Allow dynamic origins for remote access
  await app.register(cors, {
    origin: (origin, callback) => {
      // In development, allow all origins for flexibility with changing IPs
      if (config.node_env === 'development') {
        callback(null, true);
        return;
      }
      // In production, only allow configured frontend URL
      if (!origin || origin === config.frontendUrl) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // Register Helmet for security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Customize as needed
  });

  // Register rate limiting
  await app.register(rateLimit, {
    max: config.rateLimitMaxRequests,
    timeWindow: config.rateLimitWindowMs,
    cache: 10000,
  });

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.node_env,
    };
  });

  // API info endpoint
  app.get('/', async () => {
    return {
      name: 'IIoT Account Intelligence API',
      version: '1.0.0',
      environment: config.node_env,
    };
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(reportRoutes, { prefix: '/api/reports' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(promptRoutes, { prefix: '/api/admin/prompts' });
  await app.register(templateRoutes, { prefix: '/api/templates' });
  await app.register(scheduleRoutes, { prefix: '/api/schedules' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(podcastRoutes, { prefix: '/api' }); // Podcast routes at /api level for /api/reports/:id/podcast

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`,
      },
    });
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      body: request.body,
    });

    // Handle specific error types
    if (error.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
        },
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
        },
      });
    }

    // Default error response
    reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: error.statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: config.node_env === 'production'
          ? 'An unexpected error occurred'
          : error.message,
      },
    });
  });

  return app;
}

export default createApp;

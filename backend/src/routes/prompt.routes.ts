// Prompt Routes - API endpoints for prompt management (admin only)

import { FastifyInstance } from 'fastify';
import { PromptController } from '../controllers/prompt.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

export async function promptRoutes(app: FastifyInstance) {
  const promptController = new PromptController();

  // All routes require authentication AND admin role
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', adminMiddleware);

  // List all prompts with optional category filter
  app.get('/', {
    schema: {
      description: 'List all prompts (admin only)',
      tags: ['Prompts'],
      querystring: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['REPORT_SYSTEM', 'REPORT_SECTION', 'PODCAST_SYSTEM', 'PODCAST_HOST']
          }
        },
      },
      // Removed response schema to allow full data to be serialized
    },
  }, promptController.listPrompts.bind(promptController));

  // Get a single prompt by ID with versions
  app.get('/:id', {
    schema: {
      description: 'Get a prompt by ID with version history (admin only)',
      tags: ['Prompts'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      // Removed response schema to allow full data serialization
    },
  }, promptController.getPromptById.bind(promptController));

  // Update a prompt (creates new version)
  app.put('/:id', {
    schema: {
      description: 'Update a prompt (creates new version) (admin only)',
      tags: ['Prompts'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          promptText: { type: 'string' },
          parameters: { type: 'object' },
          changeReason: { type: 'string', maxLength: 500 },
        },
      },
      // Removed response schema to allow full data serialization
    },
  }, promptController.updatePrompt.bind(promptController));

  // Get version history for a prompt
  app.get('/:id/versions', {
    schema: {
      description: 'Get version history for a prompt (admin only)',
      tags: ['Prompts'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      // Removed response schema to allow full data serialization
    },
  }, promptController.getVersionHistory.bind(promptController));

  // Revert to a specific version
  app.post('/:id/revert/:version', {
    schema: {
      description: 'Revert a prompt to a specific version (admin only)',
      tags: ['Prompts'],
      params: {
        type: 'object',
        required: ['id', 'version'],
        properties: {
          id: { type: 'string' },
          version: { type: 'string' },
        },
      },
      // Removed response schema to allow full data serialization
    },
  }, promptController.revertToVersion.bind(promptController));

  // Reset prompt to default
  app.post('/:id/reset', {
    schema: {
      description: 'Reset a prompt to default (admin only)',
      tags: ['Prompts'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      // Removed response schema to allow full data serialization
    },
  }, promptController.resetToDefault.bind(promptController));

  // Get cache statistics
  app.get('/cache/stats', {
    schema: {
      description: 'Get prompt cache statistics (admin only)',
      tags: ['Prompts'],
      // Removed response schema to allow full data serialization
    },
  }, promptController.getCacheStats.bind(promptController));

  // Invalidate cache
  app.post('/cache/invalidate', {
    schema: {
      description: 'Invalidate prompt cache (admin only)',
      tags: ['Prompts'],
      body: {
        type: 'object',
        properties: {
          key: { type: 'string' },
        },
      },
      // Removed response schema to allow full data serialization
    },
  }, promptController.invalidateCache.bind(promptController));
}

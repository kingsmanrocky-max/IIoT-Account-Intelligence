// Prompt Controller - Handles HTTP requests for prompt management (admin only)

import { FastifyRequest, FastifyReply } from 'fastify';
import { PromptCategory } from '@prisma/client';
import { getPromptService, UpdatePromptInput } from '../services/prompt.service';
import logger from '../utils/logger';

interface UpdatePromptBody {
  promptText?: string;
  parameters?: Record<string, unknown>;
  changeReason?: string;
}

interface ListPromptsQuery {
  category?: PromptCategory;
}

interface RevertVersionParams {
  id: string;
  version: string;
}

export class PromptController {
  private promptService = getPromptService();

  // List all prompts with optional category filter
  async listPrompts(
    request: FastifyRequest<{ Querystring: ListPromptsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { category } = request.query;

      const prompts = await this.promptService.listPrompts(category);

      return reply.status(200).send({
        success: true,
        data: prompts,
        count: prompts.length,
      });
    } catch (error) {
      logger.error('List prompts error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'LIST_PROMPTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list prompts',
        },
      });
    }
  }

  // Get a single prompt by ID
  async getPromptById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;

      const prompt = await this.promptService.getPromptWithVersions(id);

      if (!prompt) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'PROMPT_NOT_FOUND',
            message: `Prompt not found: ${id}`,
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: prompt,
      });
    } catch (error) {
      logger.error('Get prompt error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'GET_PROMPT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get prompt',
        },
      });
    }
  }

  // Update a prompt (creates new version)
  async updatePrompt(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdatePromptBody }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;
      const { promptText, parameters, changeReason } = request.body;

      // Validate at least one field is provided
      if (!promptText && !parameters) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_UPDATE',
            message: 'At least one of promptText or parameters must be provided',
          },
        });
      }

      const updateData: UpdatePromptInput = {};
      if (promptText !== undefined) updateData.promptText = promptText;
      if (parameters !== undefined) updateData.parameters = parameters;
      if (changeReason) updateData.changeReason = changeReason;

      const prompt = await this.promptService.updatePrompt(id, updateData, userId);

      logger.info(`Prompt updated by admin ${userId}: ${id}`);

      return reply.status(200).send({
        success: true,
        data: prompt,
        message: 'Prompt updated successfully',
      });
    } catch (error) {
      logger.error('Update prompt error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'UPDATE_PROMPT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update prompt',
        },
      });
    }
  }

  // Get version history for a prompt
  async getVersionHistory(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;

      const versions = await this.promptService.getVersionHistory(id);

      return reply.status(200).send({
        success: true,
        data: versions,
        count: versions.length,
      });
    } catch (error) {
      logger.error('Get version history error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'GET_VERSION_HISTORY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get version history',
        },
      });
    }
  }

  // Revert to a specific version
  async revertToVersion(
    request: FastifyRequest<{ Params: RevertVersionParams }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id, version } = request.params;
      const versionNumber = parseInt(version, 10);

      if (isNaN(versionNumber)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_VERSION',
            message: 'Version must be a valid number',
          },
        });
      }

      const prompt = await this.promptService.revertToVersion(id, versionNumber, userId);

      logger.info(`Prompt reverted to version ${versionNumber} by admin ${userId}: ${id}`);

      return reply.status(200).send({
        success: true,
        data: prompt,
        message: `Prompt reverted to version ${versionNumber}`,
      });
    } catch (error) {
      logger.error('Revert prompt error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'REVERT_PROMPT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to revert prompt',
        },
      });
    }
  }

  // Reset prompt to default
  async resetToDefault(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { id } = request.params;

      const prompt = await this.promptService.resetToDefault(id, userId);

      logger.info(`Prompt reset to default by admin ${userId}: ${id}`);

      return reply.status(200).send({
        success: true,
        data: prompt,
        message: 'Prompt reset to default successfully',
      });
    } catch (error) {
      logger.error('Reset prompt error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'RESET_PROMPT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reset prompt',
        },
      });
    }
  }

  // Get cache statistics (for monitoring)
  async getCacheStats(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const stats = this.promptService.getCacheStats();

      return reply.status(200).send({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get cache stats error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'GET_CACHE_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get cache stats',
        },
      });
    }
  }

  // Invalidate cache
  async invalidateCache(
    request: FastifyRequest<{ Body: { key?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user.id;
      const { key } = request.body;

      this.promptService.invalidateCache(key);

      logger.info(`Cache invalidated by admin ${userId}: ${key || 'all'}`);

      return reply.status(200).send({
        success: true,
        message: key ? `Cache invalidated for key: ${key}` : 'All cache invalidated',
      });
    } catch (error) {
      logger.error('Invalidate cache error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INVALIDATE_CACHE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to invalidate cache',
        },
      });
    }
  }
}

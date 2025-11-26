// Prompt Management Service - Handles CRUD operations for AI prompts with caching and versioning
import { PrismaClient, PromptConfig, PromptVersion, PromptCategory } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface UpdatePromptInput {
  promptText?: string;
  parameters?: Record<string, unknown>;
  changeReason?: string;
}

export interface PromptConfigWithVersions extends PromptConfig {
  versions: PromptVersion[];
}

export class PromptService {
  private promptCache: Map<string, { prompt: PromptConfig; cachedAt: Date }> = new Map();
  private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Get prompt by key with caching
  async getPromptByKey(key: string): Promise<PromptConfig | null> {
    // Check cache first
    const cached = this.promptCache.get(key);
    if (cached && Date.now() - cached.cachedAt.getTime() < this.CACHE_TTL_MS) {
      return cached.prompt;
    }

    // Fetch from database
    const prompt = await prisma.promptConfig.findUnique({
      where: { key, isActive: true },
    });

    if (prompt) {
      this.promptCache.set(key, { prompt, cachedAt: new Date() });
    }

    return prompt;
  }

  // List all prompts with optional category filter
  async listPrompts(category?: PromptCategory): Promise<PromptConfig[]> {
    return prisma.promptConfig.findMany({
      where: category ? { category, isActive: true } : { isActive: true },
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });
  }

  // Get prompt with version history
  async getPromptWithVersions(id: string): Promise<PromptConfigWithVersions | null> {
    return prisma.promptConfig.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });
  }

  // Update prompt (creates new version)
  async updatePrompt(id: string, data: UpdatePromptInput, userId: string): Promise<PromptConfig> {
    const existing = await prisma.promptConfig.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!existing) {
      throw new Error(`Prompt not found: ${id}`);
    }

    // Create new version with old content
    const newVersion = existing.currentVersion + 1;

    const updated = await prisma.promptConfig.update({
      where: { id },
      data: {
        promptText: data.promptText ?? existing.promptText,
        parameters: data.parameters as any ?? existing.parameters,
        currentVersion: newVersion,
        updatedBy: userId,
        versions: {
          create: {
            version: newVersion,
            promptText: data.promptText ?? existing.promptText,
            parameters: data.parameters as any ?? existing.parameters,
            changeReason: data.changeReason || 'Updated via admin',
            changedBy: userId,
          },
        },
      },
    });

    // Invalidate cache
    this.invalidateCache(existing.key);

    logger.info(`Prompt updated: ${existing.key} (version ${newVersion}) by user ${userId}`);

    return updated;
  }

  // Revert to a specific version
  async revertToVersion(id: string, version: number, userId: string): Promise<PromptConfig> {
    const existing = await prisma.promptConfig.findUnique({
      where: { id },
      include: { versions: true },
    });

    if (!existing) {
      throw new Error(`Prompt not found: ${id}`);
    }

    const targetVersion = existing.versions.find(v => v.version === version);
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for prompt ${id}`);
    }

    // Create new version with reverted content
    const newVersion = existing.currentVersion + 1;

    const updated = await prisma.promptConfig.update({
      where: { id },
      data: {
        promptText: targetVersion.promptText,
        parameters: targetVersion.parameters,
        currentVersion: newVersion,
        updatedBy: userId,
        versions: {
          create: {
            version: newVersion,
            promptText: targetVersion.promptText,
            parameters: targetVersion.parameters,
            changeReason: `Reverted to version ${version}`,
            changedBy: userId,
          },
        },
      },
    });

    // Invalidate cache
    this.invalidateCache(existing.key);

    logger.info(`Prompt reverted: ${existing.key} to version ${version} (new version ${newVersion}) by user ${userId}`);

    return updated;
  }

  // Reset to default (for customized prompts)
  async resetToDefault(id: string, userId: string): Promise<PromptConfig> {
    const existing = await prisma.promptConfig.findUnique({
      where: { id },
      include: { versions: { where: { version: 1 }, take: 1 } },
    });

    if (!existing) {
      throw new Error(`Prompt not found: ${id}`);
    }

    if (!existing.isDefault) {
      throw new Error(`Cannot reset non-default prompt: ${id}`);
    }

    const originalVersion = existing.versions[0];
    if (!originalVersion) {
      throw new Error(`Original version not found for prompt ${id}`);
    }

    // Revert to version 1 (the default)
    const newVersion = existing.currentVersion + 1;

    const updated = await prisma.promptConfig.update({
      where: { id },
      data: {
        promptText: originalVersion.promptText,
        parameters: originalVersion.parameters as any,
        currentVersion: newVersion,
        updatedBy: userId,
        versions: {
          create: {
            version: newVersion,
            promptText: originalVersion.promptText,
            parameters: originalVersion.parameters as any,
            changeReason: 'Reset to default',
            changedBy: userId,
          },
        },
      },
    });

    // Invalidate cache
    this.invalidateCache(existing.key);

    logger.info(`Prompt reset to default: ${existing.key} by user ${userId}`);

    return updated;
  }

  // Get version history for a prompt
  async getVersionHistory(id: string): Promise<PromptVersion[]> {
    return prisma.promptVersion.findMany({
      where: { promptConfigId: id },
      orderBy: { version: 'desc' },
    });
  }

  // Invalidate cache (called after updates)
  invalidateCache(key?: string): void {
    if (key) {
      this.promptCache.delete(key);
      logger.debug(`Cache invalidated for prompt: ${key}`);
    } else {
      this.promptCache.clear();
      logger.debug('All prompt cache cleared');
    }
  }

  // Get cache statistics (for monitoring)
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.promptCache.size,
      keys: Array.from(this.promptCache.keys()),
    };
  }
}

// Singleton instance
let promptServiceInstance: PromptService | null = null;

export function getPromptService(): PromptService {
  if (!promptServiceInstance) {
    promptServiceInstance = new PromptService();
  }
  return promptServiceInstance;
}

export default PromptService;

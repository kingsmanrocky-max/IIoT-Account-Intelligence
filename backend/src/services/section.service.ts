// Section Service - Manages database-driven section configuration
// Provides dynamic section management for report workflows

import { PrismaClient, WorkflowType, SectionConfig } from '@prisma/client';
import { DepthPreference } from '../types/llm.types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateSectionDto {
  key: string;
  name: string;
  description?: string;
  workflowTypes: WorkflowType[];
  depthLevels?: string[];
  displayOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
  promptConfigId?: string;
}

export interface UpdateSectionDto {
  key?: string;
  name?: string;
  description?: string;
  workflowTypes?: WorkflowType[];
  depthLevels?: string[];
  displayOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
  promptConfigId?: string;
}

export class SectionService {
  /**
   * Get all active sections for a specific workflow type
   */
  async getSectionsForWorkflow(workflowType: WorkflowType): Promise<SectionConfig[]> {
    try {
      const sections = await prisma.sectionConfig.findMany({
        where: {
          isActive: true,
          workflowTypes: {
            has: workflowType,
          },
        },
        orderBy: {
          displayOrder: 'asc',
        },
        include: {
          promptConfig: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Retrieved ${sections.length} sections for workflow ${workflowType}`);
      return sections;
    } catch (error) {
      logger.error('Error fetching sections for workflow:', error);
      throw error;
    }
  }

  /**
   * Get sections for a specific workflow and depth level
   * This is the key method that enables depth-aware section filtering
   */
  async getSectionsForWorkflowAndDepth(
    workflowType: WorkflowType,
    depth: DepthPreference
  ): Promise<SectionConfig[]> {
    try {
      const sections = await prisma.sectionConfig.findMany({
        where: {
          isActive: true,
          workflowTypes: {
            has: workflowType,
          },
          depthLevels: {
            has: depth,
          },
        },
        orderBy: {
          displayOrder: 'asc',
        },
        include: {
          promptConfig: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
        },
      });

      logger.info(
        `Retrieved ${sections.length} sections for workflow ${workflowType} at depth ${depth}`
      );
      return sections;
    } catch (error) {
      logger.error('Error fetching sections for workflow and depth:', error);
      throw error;
    }
  }

  /**
   * Get default section keys for a workflow and depth
   * Returns array of section keys to use when no sections explicitly specified
   */
  async getDefaultSections(
    workflowType: WorkflowType,
    depth: DepthPreference
  ): Promise<string[]> {
    try {
      const sections = await prisma.sectionConfig.findMany({
        where: {
          isActive: true,
          isDefault: true,
          workflowTypes: {
            has: workflowType,
          },
          depthLevels: {
            has: depth,
          },
        },
        orderBy: {
          displayOrder: 'asc',
        },
        select: {
          key: true,
        },
      });

      const sectionKeys = sections.map(s => s.key);
      logger.info(
        `Retrieved ${sectionKeys.length} default sections for ${workflowType} at ${depth}: [${sectionKeys.join(', ')}]`
      );

      return sectionKeys;
    } catch (error) {
      logger.error('Error fetching default sections:', error);
      throw error;
    }
  }

  /**
   * Validate that requested sections are valid for the workflow
   * Returns array of invalid section keys (empty if all valid)
   */
  async validateSections(
    sectionKeys: string[],
    workflowType: WorkflowType
  ): Promise<string[]> {
    try {
      const validSections = await prisma.sectionConfig.findMany({
        where: {
          isActive: true,
          key: {
            in: sectionKeys,
          },
          workflowTypes: {
            has: workflowType,
          },
        },
        select: {
          key: true,
        },
      });

      const validKeys = validSections.map(s => s.key);
      const invalidKeys = sectionKeys.filter(key => !validKeys.includes(key));

      if (invalidKeys.length > 0) {
        logger.warn(
          `Invalid sections for ${workflowType}: [${invalidKeys.join(', ')}]`
        );
      }

      return invalidKeys;
    } catch (error) {
      logger.error('Error validating sections:', error);
      throw error;
    }
  }

  /**
   * Get a single section by key
   */
  async getSectionByKey(key: string): Promise<SectionConfig | null> {
    try {
      const section = await prisma.sectionConfig.findUnique({
        where: { key },
        include: {
          promptConfig: true,
        },
      });

      return section;
    } catch (error) {
      logger.error(`Error fetching section ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all sections (for admin UI)
   */
  async getAllSections(): Promise<SectionConfig[]> {
    try {
      const sections = await prisma.sectionConfig.findMany({
        orderBy: [{ workflowTypes: 'asc' }, { displayOrder: 'asc' }],
        include: {
          promptConfig: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
        },
      });

      return sections;
    } catch (error) {
      logger.error('Error fetching all sections:', error);
      throw error;
    }
  }

  /**
   * Create a new section (admin only)
   */
  async createSection(data: CreateSectionDto): Promise<SectionConfig> {
    try {
      const section = await prisma.sectionConfig.create({
        data: {
          key: data.key,
          name: data.name,
          description: data.description,
          workflowTypes: data.workflowTypes,
          depthLevels: data.depthLevels || ['brief', 'standard', 'detailed'],
          displayOrder: data.displayOrder || 100,
          isActive: data.isActive !== undefined ? data.isActive : true,
          isDefault: data.isDefault !== undefined ? data.isDefault : false,
          promptConfigId: data.promptConfigId,
        },
        include: {
          promptConfig: true,
        },
      });

      logger.info(`Created new section: ${section.key}`);
      return section;
    } catch (error) {
      logger.error('Error creating section:', error);
      throw error;
    }
  }

  /**
   * Update an existing section (admin only)
   */
  async updateSection(id: string, data: UpdateSectionDto): Promise<SectionConfig> {
    try {
      const section = await prisma.sectionConfig.update({
        where: { id },
        data: {
          key: data.key,
          name: data.name,
          description: data.description,
          workflowTypes: data.workflowTypes,
          depthLevels: data.depthLevels,
          displayOrder: data.displayOrder,
          isActive: data.isActive,
          isDefault: data.isDefault,
          promptConfigId: data.promptConfigId,
        },
        include: {
          promptConfig: true,
        },
      });

      logger.info(`Updated section: ${section.key}`);
      return section;
    } catch (error) {
      logger.error('Error updating section:', error);
      throw error;
    }
  }

  /**
   * Delete a section (soft delete by setting isActive = false)
   */
  async deleteSection(id: string): Promise<void> {
    try {
      await prisma.sectionConfig.update({
        where: { id },
        data: { isActive: false },
      });

      logger.info(`Soft deleted section: ${id}`);
    } catch (error) {
      logger.error('Error deleting section:', error);
      throw error;
    }
  }

  /**
   * Hard delete a section (permanent removal - use with caution)
   */
  async hardDeleteSection(id: string): Promise<void> {
    try {
      await prisma.sectionConfig.delete({
        where: { id },
      });

      logger.info(`Hard deleted section: ${id}`);
    } catch (error) {
      logger.error('Error hard deleting section:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sectionService = new SectionService();

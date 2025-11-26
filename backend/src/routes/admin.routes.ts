// Admin Routes - System configuration and management endpoints
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getAdminService } from '../services/admin.service';
import { getUserManagementService } from '../services/user-management.service';
import { getCleanupProcessor } from '../services/cleanup-processor';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import logger from '../utils/logger';

interface UpdateSettingsBody {
  llmPrimaryProvider?: string;
  llmDefaultModel?: string;
  openaiApiKey?: string;
  xaiApiKey?: string;
  webexBotToken?: string;
  reportRetentionDays?: number;
}

interface TestConnectionParams {
  provider: string;
}

interface UsersListQuery {
  role?: 'ADMIN' | 'USER';
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

interface UserIdParams {
  id: string;
}

interface CreateUserBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'USER';
}

interface UpdateUserBody {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'USER';
  isActive?: boolean;
}

interface ResetPasswordBody {
  newPassword: string;
}

export async function adminRoutes(fastify: FastifyInstance) {
  const adminService = getAdminService();
  const userService = getUserManagementService();

  // All admin routes require authentication and admin role
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', adminMiddleware);

  // Get system settings (masked sensitive values)
  fastify.get('/settings', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const settings = await adminService.getSettingsForDisplay();
      return reply.send({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error('Failed to get settings:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SETTINGS_ERROR', message: 'Failed to retrieve settings' },
      });
    }
  });

  // Update system settings
  fastify.put<{ Body: UpdateSettingsBody }>(
    '/settings',
    async (request: FastifyRequest<{ Body: UpdateSettingsBody }>, reply: FastifyReply) => {
      try {
        const updates = request.body;

        // Validate provider if specified
        if (updates.llmPrimaryProvider && !['openai', 'xai'].includes(updates.llmPrimaryProvider)) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_PROVIDER', message: 'Invalid LLM provider' },
          });
        }

        await adminService.updateSettings(updates);

        const settings = await adminService.getSettingsForDisplay();
        return reply.send({
          success: true,
          data: settings,
          message: 'Settings updated successfully',
        });
      } catch (error) {
        logger.error('Failed to update settings:', error);
        return reply.status(500).send({
          success: false,
          error: { code: 'UPDATE_ERROR', message: 'Failed to update settings' },
        });
      }
    }
  );

  // Get available LLM providers and models
  fastify.get('/providers', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const providers = adminService.getAvailableProviders();
      return reply.send({
        success: true,
        data: providers,
      });
    } catch (error) {
      logger.error('Failed to get providers:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'PROVIDERS_ERROR', message: 'Failed to retrieve providers' },
      });
    }
  });

  // Test LLM connection
  fastify.post<{ Params: TestConnectionParams }>(
    '/test-llm/:provider',
    async (request: FastifyRequest<{ Params: TestConnectionParams }>, reply: FastifyReply) => {
      try {
        const { provider } = request.params;

        if (!['openai', 'xai'].includes(provider)) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_PROVIDER', message: 'Invalid provider' },
          });
        }

        const result = await adminService.testLLMConnection(provider);
        return reply.send({
          success: result.success,
          data: result,
        });
      } catch (error) {
        logger.error('LLM connection test failed:', error);
        return reply.status(500).send({
          success: false,
          error: { code: 'TEST_ERROR', message: 'Connection test failed' },
        });
      }
    }
  );

  // Test Webex connection
  fastify.post('/test-webex', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await adminService.testWebexConnection();
      return reply.send({
        success: result.success,
        data: result,
      });
    } catch (error) {
      logger.error('Webex connection test failed:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'TEST_ERROR', message: 'Connection test failed' },
      });
    }
  });

  // ==================== User Management Routes ====================

  // List users
  fastify.get<{ Querystring: UsersListQuery }>(
    '/users',
    async (request, reply) => {
      try {
        const { role, isActive, search, limit = 20, offset = 0, sortBy, sortOrder } = request.query;

        const result = await userService.listUsers({
          role: role as 'ADMIN' | 'USER' | undefined,
          isActive: isActive !== undefined ? isActive : undefined,
          search,
          limit: Math.min(limit, 100),
          offset: Math.max(offset, 0),
          sortBy,
          sortOrder,
        });

        return reply.send({
          success: true,
          data: result.users,
          pagination: {
            total: result.total,
            limit,
            offset,
          },
        });
      } catch (error) {
        logger.error('Failed to list users:', error);
        return reply.status(500).send({
          success: false,
          error: { code: 'USERS_ERROR', message: 'Failed to retrieve users' },
        });
      }
    }
  );

  // Get user by ID
  fastify.get<{ Params: UserIdParams }>(
    '/users/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const user = await userService.getUserById(id);

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'User not found' },
          });
        }

        // Get user stats
        const stats = await userService.getUserStats(id);

        return reply.send({
          success: true,
          data: { ...user, stats },
        });
      } catch (error) {
        logger.error('Failed to get user:', error);
        return reply.status(500).send({
          success: false,
          error: { code: 'USER_ERROR', message: 'Failed to retrieve user' },
        });
      }
    }
  );

  // Create user
  fastify.post<{ Body: CreateUserBody }>(
    '/users',
    async (request, reply) => {
      try {
        const { email, password, firstName, lastName, role } = request.body;

        if (!email || !password) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
          });
        }

        const user = await userService.createUser({
          email,
          password,
          firstName,
          lastName,
          role: role as 'ADMIN' | 'USER' | undefined,
        });

        return reply.status(201).send({
          success: true,
          data: user,
          message: 'User created successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create user';
        logger.error('Failed to create user:', error);
        return reply.status(400).send({
          success: false,
          error: { code: 'CREATE_ERROR', message },
        });
      }
    }
  );

  // Update user
  fastify.put<{ Params: UserIdParams; Body: UpdateUserBody }>(
    '/users/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { email, firstName, lastName, role, isActive } = request.body;

        const user = await userService.updateUser(id, {
          email,
          firstName,
          lastName,
          role: role as 'ADMIN' | 'USER' | undefined,
          isActive,
        });

        return reply.send({
          success: true,
          data: user,
          message: 'User updated successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update user';
        logger.error('Failed to update user:', error);

        if (message === 'User not found') {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message },
          });
        }

        return reply.status(400).send({
          success: false,
          error: { code: 'UPDATE_ERROR', message },
        });
      }
    }
  );

  // Delete user
  fastify.delete<{ Params: UserIdParams }>(
    '/users/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        await userService.deleteUser(id);

        return reply.send({
          success: true,
          message: 'User deleted successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete user';
        logger.error('Failed to delete user:', error);

        if (message === 'User not found') {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message },
          });
        }

        return reply.status(400).send({
          success: false,
          error: { code: 'DELETE_ERROR', message },
        });
      }
    }
  );

  // Toggle user active status
  fastify.post<{ Params: UserIdParams }>(
    '/users/:id/toggle-active',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const user = await userService.toggleActive(id);

        return reply.send({
          success: true,
          data: user,
          message: user.isActive ? 'User activated' : 'User deactivated',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to toggle user status';
        logger.error('Failed to toggle user status:', error);

        if (message === 'User not found') {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message },
          });
        }

        return reply.status(400).send({
          success: false,
          error: { code: 'TOGGLE_ERROR', message },
        });
      }
    }
  );

  // Reset user password
  fastify.post<{ Params: UserIdParams; Body: ResetPasswordBody }>(
    '/users/:id/reset-password',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { newPassword } = request.body;

        if (!newPassword) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'New password is required' },
          });
        }

        await userService.resetPassword(id, newPassword);

        return reply.send({
          success: true,
          message: 'Password reset successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reset password';
        logger.error('Failed to reset password:', error);

        if (message === 'User not found') {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message },
          });
        }

        return reply.status(400).send({
          success: false,
          error: { code: 'RESET_ERROR', message },
        });
      }
    }
  );

  // ==================== Data Management Routes ====================

  // Trigger manual cleanup
  fastify.post('/cleanup', async (_request, reply) => {
    try {
      const cleanupProcessor = getCleanupProcessor();

      if (cleanupProcessor.isCleanupRunning()) {
        return reply.status(409).send({
          success: false,
          error: { code: 'CLEANUP_IN_PROGRESS', message: 'Cleanup is already running' },
        });
      }

      const stats = await cleanupProcessor.triggerManualCleanup();

      return reply.send({
        success: true,
        data: stats,
        message: 'Cleanup completed successfully',
      });
    } catch (error) {
      logger.error('Manual cleanup failed:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'CLEANUP_ERROR', message: 'Cleanup failed' },
      });
    }
  });

  // Get cleanup status
  fastify.get('/cleanup/status', async (_request, reply) => {
    try {
      const cleanupProcessor = getCleanupProcessor();

      return reply.send({
        success: true,
        data: {
          isRunning: cleanupProcessor.isCleanupRunning(),
        },
      });
    } catch (error) {
      logger.error('Failed to get cleanup status:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'STATUS_ERROR', message: 'Failed to get cleanup status' },
      });
    }
  });
}

export default adminRoutes;

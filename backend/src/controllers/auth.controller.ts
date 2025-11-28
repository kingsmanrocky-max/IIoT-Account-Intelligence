import { FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

interface RegisterBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

interface RequestAccountBody {
  name: string;
  email: string;
  reason: string;
}

export class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply
  ) {
    try {
      const { email, password, firstName, lastName } = request.body;

      // Basic validation
      if (!email || !password) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
          },
        });
      }

      // Password strength validation
      if (password.length < 8) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 8 characters long',
          },
        });
      }

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
      });

      return reply.status(201).send({
        success: true,
        data: result,
        message: 'User registered successfully',
      });
    } catch (error: any) {
      logger.error('Register controller error:', error);

      if (error.message.includes('already exists')) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'ALREADY_EXISTS',
            message: error.message,
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during registration',
        },
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(
    request: FastifyRequest<{ Body: LoginBody }>,
    reply: FastifyReply
  ) {
    try {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        });
      }

      const result = await authService.login(email, password);

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error: any) {
      logger.error('Login controller error:', error);

      if (error.message.includes('Invalid credentials') || error.message.includes('deactivated')) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: error.message,
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login',
        },
      });
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  async getCurrentUser(request: AuthRequest, reply: FastifyReply) {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const user = await authService.getUserById(request.user.id);

      return reply.status(200).send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error('Get current user error:', error);

      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user data',
        },
      });
    }
  }

  /**
   * Logout (client-side token removal)
   * POST /api/auth/logout
   */
  async logout(request: AuthRequest, reply: FastifyReply) {
    // In JWT-based auth, logout is handled client-side
    // This endpoint is here for consistency and logging
    if (request.user) {
      logger.info(`User logged out: ${request.user.email}`);
    }

    return reply.status(200).send({
      success: true,
      message: 'Logout successful',
    });
  }

  /**
   * Change password
   * POST /api/auth/change-password
   */
  async changePassword(
    request: FastifyRequest<{ Body: ChangePasswordBody }> & AuthRequest,
    reply: FastifyReply
  ) {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const { currentPassword, newPassword } = request.body;

      if (!currentPassword || !newPassword) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current password and new password are required',
          },
        });
      }

      if (newPassword.length < 8) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'New password must be at least 8 characters long',
          },
        });
      }

      await authService.changePassword(
        request.user.id,
        currentPassword,
        newPassword
      );

      return reply.status(200).send({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      logger.error('Change password error:', error);

      if (error.message.includes('incorrect')) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: error.message,
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to change password',
        },
      });
    }
  }

  /**
   * Request account access
   * POST /api/auth/request-account
   */
  async requestAccount(
    request: FastifyRequest<{ Body: RequestAccountBody }>,
    reply: FastifyReply
  ) {
    try {
      const { name, email, reason } = request.body;

      // Basic validation
      if (!name || !email || !reason) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, email, and reason are required',
          },
        });
      }

      // Name validation
      if (name.length < 2) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name must be at least 2 characters',
          },
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
          },
        });
      }

      // Reason validation
      if (reason.length < 20) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please provide a more detailed reason (at least 20 characters)',
          },
        });
      }

      if (reason.length > 500) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Reason must be less than 500 characters',
          },
        });
      }

      await authService.sendAccountRequest({ name, email, reason });

      return reply.status(200).send({
        success: true,
        message: 'Account request submitted successfully',
      });
    } catch (error: any) {
      logger.error('Request account error:', error);

      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit account request',
        },
      });
    }
  }
}

export default new AuthController();

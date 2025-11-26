import { FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service';
import { logger } from '../utils/logger';

export interface AuthRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
  };
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authMiddleware(
  request: AuthRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = authService.verifyToken(token);

    // Attach user to request
    request.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as 'ADMIN' | 'USER',
    };

    // Log access
    logger.debug(`Authenticated request from user: ${decoded.email}`);
  } catch (error: any) {
    logger.warn('Authentication failed:', error.message);
    return reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
}

/**
 * Admin middleware
 * Checks if user has admin role
 */
export async function adminMiddleware(
  request: AuthRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  if (request.user.role !== 'ADMIN') {
    logger.warn(`Unauthorized admin access attempt by user: ${request.user.email}`);
    return reply.status(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
  }
}

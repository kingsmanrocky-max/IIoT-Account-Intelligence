import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../models';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { User } from '@prisma/client';
import { getActivityTrackingService } from './activity-tracking.service';
import { getWebexDeliveryService } from './webex-delivery.service';

interface LoginResult {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface AccountRequestData {
  name: string;
  email: string;
  reason: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<LoginResult> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      // Create user with profile
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'USER', // Default role
          profile: {
            create: {
              timezone: 'UTC',
              defaultLLMModel: 'gpt-4',
            },
          },
        },
        include: {
          profile: true,
        },
      });

      logger.info(`New user registered: ${user.email}`);

      // Log activity
      const activityService = getActivityTrackingService();
      await activityService.logActivity(user.id, 'REGISTER', {
        resourceId: user.id,
        resourceType: 'User',
      });

      // Generate JWT token
      const token = this.generateToken(user.id, user.email, user.role);

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          profile: true,
        },
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      logger.info(`User logged in: ${user.email}`);

      // Log activity
      const activityService = getActivityTrackingService();
      await activityService.logActivity(user.id, 'LOGIN', {
        resourceId: user.id,
        resourceType: 'User',
      });

      // Generate JWT token
      const token = this.generateToken(user.id, user.email, user.role);

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Remove password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, email: string, role: string): string {
    const payload = {
      userId,
      email,
      role,
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration,
    } as any);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; email: string; role: string } {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        email: string;
        role: string;
      };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      logger.info(`Password changed for user: ${user.email}`);

      // Log activity
      const activityService = getActivityTrackingService();
      await activityService.logActivity(userId, 'PASSWORD_CHANGE', {
        resourceId: userId,
        resourceType: 'User',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Send account request to Webex room
   */
  async sendAccountRequest(data: AccountRequestData): Promise<void> {
    try {
      const message = this.buildAccountRequestMessage(data);
      const roomId = '98df5cb0-c315-11f0-bcbc-edbb730802e7';

      const webexService = getWebexDeliveryService();
      await webexService.sendWebexMessage(roomId, message, 'roomId');

      logger.info(`Account request sent to Webex for: ${data.email}`);
    } catch (error) {
      logger.error('Send account request error:', error);
      throw new Error('Failed to send account request');
    }
  }

  /**
   * Build formatted message for account request
   */
  private buildAccountRequestMessage(data: AccountRequestData): string {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'long',
      timeStyle: 'short',
    });

    return `
# New Account Request

**Timestamp:** ${timestamp}

**Requester Information:**
- **Name:** ${data.name}
- **Email:** ${data.email}

**Reason for Request:**
${data.reason}

---
*This request was submitted through the IIoT Account Intelligence platform.*
    `.trim();
  }
}

export default new AuthService();

// User Management Service - Admin CRUD operations for users
import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Types
export interface UserListFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface SafeUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  reportCount?: number;
}

export interface UserStats {
  totalReports: number;
  totalTemplates: number;
  totalSchedules: number;
  lastActivity: Date | null;
}

// Convert User to SafeUser (without password)
function toSafeUser(user: User, reportCount?: number): SafeUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    reportCount,
  };
}

export class UserManagementService {
  // List users with filters and pagination
  async listUsers(filters: UserListFilters): Promise<{ users: SafeUser[]; total: number }> {
    const {
      role,
      isActive,
      search,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: {
      role?: UserRole;
      isActive?: boolean;
      OR?: Array<{ email?: { contains: string; mode: 'insensitive' }; firstName?: { contains: string; mode: 'insensitive' }; lastName?: { contains: string; mode: 'insensitive' } }>;
    } = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { reports: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => toSafeUser(user, user._count.reports)),
      total,
    };
  }

  // Get user by ID
  async getUserById(userId: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { reports: true },
        },
      },
    });

    if (!user) return null;
    return toSafeUser(user, user._count.reports);
  }

  // Create new user
  async createUser(data: CreateUserInput): Promise<SafeUser> {
    const { email, password, firstName, lastName, role = 'USER' } = data;

    logger.info('Creating new user', { email, role });

    // Validate email
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('Email already registered');
    }

    // Validate password
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        role,
        isActive: true,
      },
    });

    logger.info('User created', { userId: user.id, email });
    return toSafeUser(user);
  }

  // Update user
  async updateUser(userId: string, data: UpdateUserInput): Promise<SafeUser> {
    logger.info('Updating user', { userId });

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new Error('User not found');
    }

    // If email is being changed, check for duplicates
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailExists) {
        throw new Error('Email already registered');
      }
    }

    const updateData: {
      email?: string;
      firstName?: string | null;
      lastName?: string | null;
      role?: UserRole;
      isActive?: boolean;
    } = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.firstName = data.firstName?.trim() || null;
    if (data.lastName !== undefined) updateData.lastName = data.lastName?.trim() || null;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    logger.info('User updated', { userId });
    return toSafeUser(user);
  }

  // Delete user
  async deleteUser(userId: string): Promise<void> {
    logger.info('Deleting user', { userId });

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new Error('User not found');
    }

    // Cascade delete will handle related records
    await prisma.user.delete({ where: { id: userId } });

    logger.info('User deleted', { userId });
  }

  // Toggle user active status
  async toggleActive(userId: string): Promise<SafeUser> {
    logger.info('Toggling user active status', { userId });

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new Error('User not found');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !existing.isActive },
    });

    logger.info('User active status toggled', { userId, isActive: user.isActive });
    return toSafeUser(user);
  }

  // Reset user password
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    logger.info('Resetting user password', { userId });

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new Error('User not found');
    }

    // Validate password
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    logger.info('User password reset', { userId });
  }

  // Get user statistics
  async getUserStats(userId: string): Promise<UserStats> {
    const [
      totalReports,
      totalTemplates,
      totalSchedules,
      lastActivity,
    ] = await Promise.all([
      prisma.report.count({ where: { userId } }),
      prisma.template.count({ where: { userId } }),
      prisma.schedule.count({ where: { userId } }),
      prisma.userActivity.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalReports,
      totalTemplates,
      totalSchedules,
      lastActivity: lastActivity?.createdAt || null,
    };
  }
}

// Singleton instance
let userManagementServiceInstance: UserManagementService | null = null;

export function getUserManagementService(): UserManagementService {
  if (!userManagementServiceInstance) {
    userManagementServiceInstance = new UserManagementService();
  }
  return userManagementServiceInstance;
}

export default UserManagementService;

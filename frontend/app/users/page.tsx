'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  adminAPI,
  AdminUser,
  UserRole,
  CreateUserInput,
  UpdateUserInput,
} from '@/lib/api';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Shield,
  ShieldOff,
  Trash2,
  Edit,
  Key,
  Loader2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [activeFilter, setActiveFilter] = useState<boolean | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Redirect non-admins
  if (user?.role !== 'ADMIN') {
    router.push('/dashboard');
    return null;
  }

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, activeFilter],
    queryFn: async () => {
      const response = await adminAPI.listUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        isActive: activeFilter === '' ? undefined : activeFilter,
        limit: 50,
      });
      return response.data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserInput) => adminAPI.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreateModal(false);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      adminAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowEditModal(false);
      setSelectedUser(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => adminAPI.toggleUserActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      adminAPI.resetUserPassword(id, password),
    onSuccess: () => {
      setShowResetPasswordModal(false);
      setSelectedUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    },
  });

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createUserMutation.mutate({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      firstName: formData.get('firstName') as string || undefined,
      lastName: formData.get('lastName') as string || undefined,
      role: formData.get('role') as UserRole,
    });
  };

  const handleUpdateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    const formData = new FormData(e.currentTarget);
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: {
        email: formData.get('email') as string,
        firstName: formData.get('firstName') as string || undefined,
        lastName: formData.get('lastName') as string || undefined,
        role: formData.get('role') as UserRole,
      },
    });
  };

  const handleResetPassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    const formData = new FormData(e.currentTarget);
    resetPasswordMutation.mutate({
      id: selectedUser.id,
      password: formData.get('newPassword') as string,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-meraki-gray-900">User Management</h1>
            <p className="text-meraki-gray-500 mt-1 text-sm">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-meraki-blue text-white rounded-lg hover:bg-meraki-blue-dark transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-meraki-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            className="px-3 py-2 border border-meraki-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="USER">User</option>
          </select>
          <select
            value={activeFilter === '' ? '' : activeFilter.toString()}
            onChange={(e) =>
              setActiveFilter(e.target.value === '' ? '' : e.target.value === 'true')
            }
            className="px-3 py-2 border border-meraki-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-meraki-gray-200 shadow-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-meraki-blue" />
            </div>
          ) : usersData?.data && usersData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-meraki-gray-50 border-b border-meraki-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-meraki-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-meraki-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-meraki-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-meraki-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-meraki-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-meraki-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-meraki-gray-200">
                  {usersData.data.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-meraki-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-meraki-blue/10 flex items-center justify-center">
                            <span className="text-meraki-blue font-medium">
                              {(userItem.firstName?.[0] || userItem.email[0]).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-meraki-gray-900">
                              {userItem.firstName && userItem.lastName
                                ? `${userItem.firstName} ${userItem.lastName}`
                                : userItem.email}
                            </div>
                            <div className="text-sm text-meraki-gray-500">{userItem.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userItem.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {userItem.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userItem.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {userItem.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-meraki-gray-500">
                        {userItem.lastLoginAt
                          ? formatDistanceToNow(new Date(userItem.lastLoginAt), {
                              addSuffix: true,
                            })
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-meraki-gray-500">
                        {formatDistanceToNow(new Date(userItem.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenMenuId(openMenuId === userItem.id ? null : userItem.id)
                            }
                            className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 rounded-lg hover:bg-meraki-gray-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === userItem.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-meraki-gray-200 py-1 z-10">
                              <button
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setShowEditModal(true);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-meraki-gray-700 hover:bg-meraki-gray-50"
                              >
                                <Edit className="h-4 w-4" />
                                Edit User
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setShowResetPasswordModal(true);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-meraki-gray-700 hover:bg-meraki-gray-50"
                              >
                                <Key className="h-4 w-4" />
                                Reset Password
                              </button>
                              <button
                                onClick={() => {
                                  toggleActiveMutation.mutate(userItem.id);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-meraki-gray-700 hover:bg-meraki-gray-50"
                              >
                                {userItem.isActive ? (
                                  <>
                                    <ShieldOff className="h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </button>
                              {userItem.id !== user?.id && (
                                <button
                                  onClick={() => {
                                    setSelectedUser(userItem);
                                    setShowDeleteConfirm(true);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete User
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20">
              <Users className="h-12 w-12 mx-auto text-meraki-gray-400 mb-4" />
              <p className="text-meraki-gray-600 font-medium">No users found</p>
              <p className="text-meraki-gray-500 text-sm mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-meraki-gray-200">
              <h2 className="text-lg font-semibold text-meraki-gray-900">Create New User</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 rounded-lg hover:bg-meraki-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-meraki-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  defaultValue="USER"
                  className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {createUserMutation.isError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {(createUserMutation.error as Error)?.message || 'Failed to create user'}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-meraki-gray-700 border border-meraki-gray-300 rounded-lg hover:bg-meraki-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-meraki-blue text-white rounded-lg hover:bg-meraki-blue-dark disabled:opacity-50"
                >
                  {createUserMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-meraki-gray-200">
              <h2 className="text-lg font-semibold text-meraki-gray-900">Edit User</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 rounded-lg hover:bg-meraki-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={selectedUser.email}
                  required
                  className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    defaultValue={selectedUser.firstName || ''}
                    className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    defaultValue={selectedUser.lastName || ''}
                    className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-meraki-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  defaultValue={selectedUser.role}
                  className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {updateUserMutation.isError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {(updateUserMutation.error as Error)?.message || 'Failed to update user'}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-meraki-gray-700 border border-meraki-gray-300 rounded-lg hover:bg-meraki-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-meraki-blue text-white rounded-lg hover:bg-meraki-blue-dark disabled:opacity-50"
                >
                  {updateUserMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-meraki-gray-200">
              <h2 className="text-lg font-semibold text-meraki-gray-900">Reset Password</h2>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 rounded-lg hover:bg-meraki-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-sm text-meraki-gray-600">
                Reset password for <strong>{selectedUser.email}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                />
              </div>
              {resetPasswordMutation.isError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {(resetPasswordMutation.error as Error)?.message || 'Failed to reset password'}
                </div>
              )}
              {resetPasswordMutation.isSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Check className="h-4 w-4" />
                  Password reset successfully
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-meraki-gray-700 border border-meraki-gray-300 rounded-lg hover:bg-meraki-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-meraki-blue text-white rounded-lg hover:bg-meraki-blue-dark disabled:opacity-50"
                >
                  {resetPasswordMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-meraki-gray-900">Delete User</h2>
              </div>
              <p className="text-meraki-gray-600 mb-6">
                Are you sure you want to delete <strong>{selectedUser.email}</strong>? This action
                cannot be undone.
              </p>
              {deleteUserMutation.isError && (
                <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
                  <AlertCircle className="h-4 w-4" />
                  {(deleteUserMutation.error as Error)?.message || 'Failed to delete user'}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-meraki-gray-700 border border-meraki-gray-300 rounded-lg hover:bg-meraki-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteUserMutation.mutate(selectedUser.id)}
                  disabled={deleteUserMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteUserMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </DashboardLayout>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/contexts/AuthContext';
import { authAPI } from '@/lib/api';
import {
  Settings,
  Key,
  Loader2,
  Check,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

function SettingsContent() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forcePasswordChange = searchParams.get('changePassword') === 'required';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authAPI.changePassword(data),
    onSuccess: async () => {
      setShowSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      await refreshUser();

      // If was forced, redirect to dashboard after success
      if (forcePasswordChange) {
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    },
    onError: (error: any) => {
      setPasswordError(error.response?.data?.error?.message || 'Failed to change password');
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setShowSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-meraki-gray-900">Settings</h1>
          <p className="text-meraki-gray-500 mt-1 text-sm">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Forced Password Change Alert */}
        {forcePasswordChange && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Password Change Required</h3>
              <p className="text-sm text-amber-700 mt-1">
                Your password was set by an administrator. You must change it before continuing.
              </p>
            </div>
          </div>
        )}

        {/* Change Password Section */}
        <div className="bg-white rounded-lg border border-meraki-gray-200 shadow-card">
          <div className="px-6 py-4 border-b border-meraki-gray-200">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-meraki-gray-400" />
              <h2 className="text-lg font-medium text-meraki-gray-900">Change Password</h2>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                placeholder="Enter new password (min 8 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-meraki-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {passwordError}
              </div>
            )}

            {showSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Check className="h-4 w-4" />
                Password changed successfully!
                {forcePasswordChange && ' Redirecting to dashboard...'}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-meraki-blue text-white rounded-lg hover:bg-meraki-blue-dark disabled:opacity-50"
              >
                {changePasswordMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Change Password
              </button>
            </div>
          </form>
        </div>

        {/* User Info Section (Read-only) */}
        <div className="bg-white rounded-lg border border-meraki-gray-200 shadow-card">
          <div className="px-6 py-4 border-b border-meraki-gray-200">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-meraki-gray-400" />
              <h2 className="text-lg font-medium text-meraki-gray-900">Account Information</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-meraki-gray-500">Email</label>
              <p className="mt-1 text-meraki-gray-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-meraki-gray-500">Role</label>
              <p className="mt-1 text-meraki-gray-900 capitalize">{user?.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-meraki-blue" />
        </div>
      </DashboardLayout>
    }>
      <SettingsContent />
    </Suspense>
  );
}

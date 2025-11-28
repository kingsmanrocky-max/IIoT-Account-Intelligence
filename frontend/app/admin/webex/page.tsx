'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { webexAdminAPI, type WebexInteractionListParams } from '@/lib/api';
import { WebexInteractionFeed } from '@/components/webex/WebexInteractionFeed';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { MessageSquare, CheckCircle, XCircle, TrendingUp, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { subDays } from 'date-fns';

export default function AdminWebexPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(7);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Redirect non-admins
  if (user && user.role !== 'ADMIN') {
    router.push('/dashboard');
    return null;
  }

  // Calculate date range
  const startDate = subDays(new Date(), timeRange).toISOString();

  // Fetch interactions
  const {
    data: interactionsData,
    isLoading: isLoadingInteractions,
    error: interactionsError,
  } = useQuery({
    queryKey: ['webex-interactions', page, limit, timeRange],
    queryFn: async () => {
      const params: WebexInteractionListParams = {
        page,
        limit,
        startDate,
      };
      const response = await webexAdminAPI.listInteractions(params);
      return response.data;
    },
  });

  // Fetch stats
  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: ['webex-stats', timeRange],
    queryFn: async () => {
      const response = await webexAdminAPI.getStats({ startDate });
      return response.data.data;
    },
  });

  const stats = statsData;
  const interactions = interactionsData?.data || [];
  const total = interactionsData?.pagination.total || 0;
  const totalPages = interactionsData?.pagination.totalPages || 1;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-meraki-gray-900">Webex Bot Activity</h1>
            <p className="text-meraki-gray-500 mt-1 text-sm">
              Monitor and analyze Webex bot requests and responses
            </p>
          </div>
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(Number(e.target.value) as 7 | 30 | 90);
                setPage(1);
              }}
              className="rounded-lg border border-meraki-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        {isLoadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-meraki-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-meraki-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-8 bg-meraki-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : statsError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Failed to load statistics</p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Interactions */}
            <div className="bg-white rounded-lg border border-meraki-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-meraki-gray-500">
                  Total Requests
                </p>
                <MessageSquare className="h-5 w-5 text-meraki-blue" />
              </div>
              <p className="text-3xl font-bold text-meraki-gray-900">
                {stats.totalInteractions.toLocaleString()}
              </p>
            </div>

            {/* Success Rate */}
            <div className="bg-white rounded-lg border border-meraki-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-meraki-gray-500">
                  Success Rate
                </p>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-meraki-gray-900">
                {stats.successRate.toFixed(1)}%
              </p>
              <p className="text-xs text-meraki-gray-500 mt-1">
                {stats.successCount} successful / {stats.failureCount} failed
              </p>
            </div>

            {/* Successful Requests */}
            <div className="bg-white rounded-lg border border-meraki-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-meraki-gray-500">
                  Successful
                </p>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                {stats.successCount.toLocaleString()}
              </p>
            </div>

            {/* Failed Requests */}
            <div className="bg-white rounded-lg border border-meraki-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-meraki-gray-500">
                  Failed
                </p>
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-red-600">
                {stats.failureCount.toLocaleString()}
              </p>
            </div>
          </div>
        ) : null}

        {/* Response Types Breakdown */}
        {stats && stats.byResponseType.length > 0 && (
          <div className="bg-white rounded-lg border border-meraki-gray-200 p-6">
            <h2 className="text-lg font-semibold text-meraki-gray-900 mb-4">
              Response Types
            </h2>
            <div className="space-y-3">
              {stats.byResponseType.map((item) => (
                <div key={item.responseType} className="flex items-center justify-between">
                  <span className="text-sm text-meraki-gray-700">
                    {item.responseType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-medium text-meraki-gray-900">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactions Feed */}
        <div>
          {isLoadingInteractions ? (
            <div className="bg-white rounded-lg border border-meraki-gray-200 p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-meraki-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : interactionsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Failed to load interactions</p>
            </div>
          ) : (
            <WebexInteractionFeed interactions={interactions} title={`Interactions (${total} total)`} className="border-meraki-gray-200" />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-meraki-gray-200 bg-white px-4 py-3 rounded-lg">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-meraki-gray-300 text-sm font-medium rounded-md text-meraki-gray-700 bg-white hover:bg-meraki-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-meraki-gray-300 text-sm font-medium rounded-md text-meraki-gray-700 bg-white hover:bg-meraki-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-meraki-gray-700">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-meraki-gray-300 bg-white text-sm font-medium text-meraki-gray-500 hover:bg-meraki-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-meraki-gray-300 bg-white text-sm font-medium text-meraki-gray-500 hover:bg-meraki-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

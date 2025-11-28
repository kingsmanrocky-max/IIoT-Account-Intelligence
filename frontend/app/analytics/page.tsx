'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatCard, AreaLineChart, DonutChart, ActivityFeed } from '@/components/charts';
import {
  analyticsAPI,
  webexAdminAPI,
  DashboardSummary,
  ReportTrend,
  WorkflowDistribution,
  RecentActivityItem,
  UserActivitySummary,
} from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  FileText,
  Users,
  Calendar,
  Folder,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react';

const WORKFLOW_COLORS: Record<string, string> = {
  ACCOUNT_INTELLIGENCE: '#3B82F6',
  COMPETITIVE_INTELLIGENCE: '#10B981',
  NEWS_DIGEST: '#F59E0B',
};

const WORKFLOW_NAMES: Record<string, string> = {
  ACCOUNT_INTELLIGENCE: 'Account Intelligence',
  COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence',
  NEWS_DIGEST: 'News Digest',
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    if (timeRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      startDate.setDate(startDate.getDate() - 90);
    }
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => {
      const response = await analyticsAPI.getDashboard();
      return response.data.data;
    },
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics-trends', timeRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const response = await analyticsAPI.getTrends({ startDate, endDate, groupBy: 'day' });
      return response.data.data;
    },
  });

  const { data: distributionData, isLoading: distributionLoading } = useQuery({
    queryKey: ['analytics-distribution', timeRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const response = await analyticsAPI.getDistribution({ startDate, endDate });
      return response.data.data;
    },
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['analytics-activity'],
    queryFn: async () => {
      const response = await analyticsAPI.getRecentActivity({ limit: 10 });
      return response.data.data;
    },
  });

  const { data: topUsersData, isLoading: topUsersLoading } = useQuery({
    queryKey: ['analytics-top-users'],
    queryFn: async () => {
      const response = await analyticsAPI.getTopUsers({ limit: 5, period: 'month' });
      return response.data.data;
    },
    enabled: isAdmin,
  });

  const { data: webexStatsData, isLoading: webexStatsLoading } = useQuery({
    queryKey: ['webex-stats-analytics', timeRange],
    queryFn: async () => {
      const { startDate } = getDateRange();
      const response = await webexAdminAPI.getStats({ startDate });
      return response.data.data;
    },
    enabled: isAdmin,
  });

  const isLoading = dashboardLoading || trendsLoading || distributionLoading || activityLoading;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-meraki-gray-900">Analytics</h1>
            <p className="text-meraki-gray-500 mt-1 text-sm">
              Overview of your report generation activity and usage metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              className="rounded-lg border border-meraki-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-meraki-blue" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Reports"
                value={dashboardData?.totalReports || 0}
                subtitle={`${dashboardData?.completedReports || 0} completed`}
                icon={FileText}
              />
              <StatCard
                title="Reports This Month"
                value={dashboardData?.reportsLast30Days || 0}
                subtitle={`${dashboardData?.reportsLast7Days || 0} last 7 days`}
                icon={TrendingUp}
              />
              <StatCard
                title="Active Schedules"
                value={dashboardData?.activeSchedules || 0}
                subtitle={`${dashboardData?.totalSchedules || 0} total schedules`}
                icon={Calendar}
              />
              <StatCard
                title="Templates"
                value={dashboardData?.totalTemplates || 0}
                icon={Folder}
              />
            </div>

            {/* Performance Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Avg Generation Time"
                value={formatDuration(dashboardData?.avgGenerationTime || 0)}
                icon={Clock}
              />
              <StatCard
                title="Total Tokens Used"
                value={formatNumber(dashboardData?.totalTokensUsed || 0)}
                icon={TrendingUp}
              />
              {isAdmin && (
                <>
                  <StatCard
                    title="Total Users"
                    value={dashboardData?.totalUsers || 0}
                    subtitle={`${dashboardData?.activeUsers || 0} active`}
                    icon={Users}
                  />
                  <StatCard
                    title="Webex Bot Requests"
                    value={webexStatsData?.totalInteractions || 0}
                    subtitle={`${webexStatsData?.successRate?.toFixed(1) || 0}% success rate`}
                    icon={MessageSquare}
                  />
                  <StatCard
                    title="Failed Reports"
                    value={dashboardData?.failedReports || 0}
                    icon={AlertCircle}
                  />
                </>
              )}
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Report Trends Chart */}
              {trendsData && trendsData.length > 0 ? (
                <AreaLineChart
                  title="Report Generation Trends"
                  data={trendsData as unknown as { date: string; [key: string]: string | number | undefined }[]}
                  height={320}
                  areas={[
                    { dataKey: 'completed', name: 'Completed', color: '#10B981' },
                    { dataKey: 'failed', name: 'Failed', color: '#EF4444' },
                  ]}
                />
              ) : (
                <div className="bg-white rounded-lg border border-meraki-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-meraki-gray-900 mb-4">
                    Report Generation Trends
                  </h3>
                  <div className="flex items-center justify-center h-64 text-meraki-gray-400">
                    No trend data available for this period
                  </div>
                </div>
              )}

              {/* Workflow Distribution */}
              {distributionData && distributionData.length > 0 ? (
                <div className="bg-white rounded-lg border border-meraki-gray-200 p-6 relative">
                  <h3 className="text-lg font-semibold text-meraki-gray-900 mb-4">
                    Workflow Distribution
                  </h3>
                  <DonutChart
                    data={distributionData.map((item) => ({
                      name: WORKFLOW_NAMES[item.workflowType] || item.workflowType,
                      value: item.count,
                      color: WORKFLOW_COLORS[item.workflowType],
                    }))}
                    height={280}
                    showLegend={true}
                    className="border-0 p-0"
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-meraki-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-meraki-gray-900 mb-4">
                    Workflow Distribution
                  </h3>
                  <div className="flex items-center justify-center h-64 text-meraki-gray-400">
                    No distribution data available
                  </div>
                </div>
              )}
            </div>

            {/* Activity and Top Users Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Activity */}
              <ActivityFeed
                activities={activityData || []}
                title="Recent Activity"
                showUser={isAdmin}
                className="border-meraki-gray-200"
              />

              {/* Top Users (Admin Only) */}
              {isAdmin && (
                <div className="bg-white rounded-lg border border-meraki-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-meraki-gray-900 mb-4">
                    Top Users This Month
                  </h3>
                  {topUsersLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-6 w-6 animate-spin text-meraki-blue" />
                    </div>
                  ) : topUsersData && topUsersData.length > 0 ? (
                    <div className="space-y-4">
                      {topUsersData.map((userItem, index) => (
                        <div
                          key={userItem.userId}
                          className="flex items-center justify-between py-3 border-b border-meraki-gray-100 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-meraki-blue/10 text-meraki-blue font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-meraki-gray-900 text-sm">
                                {userItem.firstName && userItem.lastName
                                  ? `${userItem.firstName} ${userItem.lastName}`
                                  : userItem.email}
                              </p>
                              {userItem.firstName && (
                                <p className="text-xs text-meraki-gray-500">{userItem.email}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-meraki-gray-900">
                              {userItem.reportCount}
                            </p>
                            <p className="text-xs text-meraki-gray-500">reports</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-meraki-gray-400">
                      No user activity data
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

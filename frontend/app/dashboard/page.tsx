'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ActivityFeed } from '@/components/charts';
import { analyticsAPI } from '@/lib/api';
import { FileText, Calendar, TrendingUp, Folder, ArrowUpRight, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await analyticsAPI.getDashboard();
      return response.data.data;
    },
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      const response = await analyticsAPI.getRecentActivity({ limit: 5 });
      return response.data.data;
    },
  });

  const isLoading = dashboardLoading;

  const stats = [
    {
      name: 'Total Reports',
      value: dashboardData?.totalReports ?? '-',
      icon: FileText,
      change: dashboardData?.reportsLast30Days
        ? `+${dashboardData.reportsLast30Days}`
        : '+0',
      changeType: dashboardData?.reportsLast30Days && dashboardData.reportsLast30Days > 0 ? 'positive' : 'neutral',
      subtitle: 'this month',
    },
    {
      name: 'Active Schedules',
      value: dashboardData?.activeSchedules ?? '-',
      icon: Calendar,
      change: `${dashboardData?.totalSchedules ?? 0} total`,
      changeType: 'neutral',
      subtitle: 'schedules',
    },
    {
      name: 'Templates',
      value: dashboardData?.totalTemplates ?? '-',
      icon: Folder,
      change: 'Available',
      changeType: 'neutral',
      subtitle: 'for reports',
    },
    {
      name: 'This Week',
      value: dashboardData?.reportsLast7Days ?? '-',
      icon: TrendingUp,
      change: dashboardData?.reportsLast30Days
        ? `${dashboardData.reportsLast30Days} this month`
        : '0 this month',
      changeType: dashboardData?.reportsLast7Days && dashboardData.reportsLast7Days > 0 ? 'positive' : 'neutral',
      subtitle: 'reports',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-semibold text-meraki-gray-900">
            Welcome back, {(user as { firstName?: string })?.firstName || user?.profile?.firstName || 'User'}!
          </h1>
          <p className="text-meraki-gray-500 mt-1.5 text-sm">
            Here's what's happening with your account intelligence platform today.
          </p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-meraki-blue" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className="rounded-card border border-meraki-gray-200 bg-white p-6 shadow-card hover:shadow-card-hover transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-meraki-gray-500">
                        {stat.name}
                      </p>
                      <p className="text-3xl font-semibold text-meraki-gray-900 mt-2">
                        {stat.value}
                      </p>
                      <p className={`text-xs mt-2 ${
                        stat.changeType === 'positive' ? 'text-meraki-blue' :
                        stat.changeType === 'negative' ? 'text-red-500' :
                        'text-meraki-gray-400'
                      }`}>
                        {stat.change} {stat.subtitle}
                      </p>
                    </div>
                    <div className="rounded-lg bg-meraki-blue/10 p-3">
                      <Icon className="h-6 w-6 text-meraki-blue" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="rounded-card border border-meraki-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-meraki-gray-900 mb-5">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/reports" className="group flex flex-col items-start gap-3 rounded-lg border border-meraki-gray-200 p-5 transition-all hover:border-meraki-blue hover:shadow-card-hover">
              <div className="flex items-center justify-between w-full">
                <div className="rounded-lg bg-meraki-blue/10 p-2.5">
                  <FileText className="h-5 w-5 text-meraki-blue" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-meraki-gray-400 group-hover:text-meraki-blue transition-colors" />
              </div>
              <div>
                <span className="font-medium text-meraki-gray-900 text-sm">Generate Report</span>
                <p className="text-xs text-meraki-gray-500 mt-1">
                  Create a new intelligence report
                </p>
              </div>
            </Link>

            <Link href="/schedules" className="group flex flex-col items-start gap-3 rounded-lg border border-meraki-gray-200 p-5 transition-all hover:border-meraki-blue hover:shadow-card-hover">
              <div className="flex items-center justify-between w-full">
                <div className="rounded-lg bg-meraki-blue/10 p-2.5">
                  <Calendar className="h-5 w-5 text-meraki-blue" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-meraki-gray-400 group-hover:text-meraki-blue transition-colors" />
              </div>
              <div>
                <span className="font-medium text-meraki-gray-900 text-sm">Schedule Report</span>
                <p className="text-xs text-meraki-gray-500 mt-1">
                  Set up recurring reports
                </p>
              </div>
            </Link>

            <Link href="/templates" className="group flex flex-col items-start gap-3 rounded-lg border border-meraki-gray-200 p-5 transition-all hover:border-meraki-blue hover:shadow-card-hover">
              <div className="flex items-center justify-between w-full">
                <div className="rounded-lg bg-meraki-blue/10 p-2.5">
                  <Folder className="h-5 w-5 text-meraki-blue" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-meraki-gray-400 group-hover:text-meraki-blue transition-colors" />
              </div>
              <div>
                <span className="font-medium text-meraki-gray-900 text-sm">View Templates</span>
                <p className="text-xs text-meraki-gray-500 mt-1">
                  Manage report templates
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        {activityLoading ? (
          <div className="rounded-card border border-meraki-gray-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-semibold text-meraki-gray-900 mb-4">Recent Activity</h2>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-meraki-blue" />
            </div>
          </div>
        ) : activityData && activityData.length > 0 ? (
          <ActivityFeed
            activities={activityData}
            title="Recent Activity"
            showUser={false}
            className="rounded-card border-meraki-gray-200 shadow-card"
          />
        ) : (
          <div className="rounded-card border border-meraki-gray-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-semibold text-meraki-gray-900 mb-4">Recent Activity</h2>
            <div className="text-center py-12">
              <div className="rounded-full bg-meraki-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-meraki-gray-400" />
              </div>
              <p className="text-sm font-medium text-meraki-gray-600">No recent activity</p>
              <p className="text-xs text-meraki-gray-500 mt-1.5">Your reports and schedules will appear here</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

'use client';

import { formatDistanceToNow } from 'date-fns';
import { FileText, Layout, Clock, User } from 'lucide-react';
import type { RecentActivityItem } from '@/lib/api';

interface ActivityFeedProps {
  activities: RecentActivityItem[];
  title?: string;
  className?: string;
  showUser?: boolean;
}

const getActivityIcon = (type: RecentActivityItem['type']) => {
  switch (type) {
    case 'report':
      return FileText;
    case 'template':
      return Layout;
    case 'schedule':
      return Clock;
    default:
      return FileText;
  }
};

const getActivityColor = (action: string) => {
  if (action.includes('created') || action.includes('CREATE')) {
    return 'text-green-500 bg-green-100 dark:bg-green-900/30';
  }
  if (action.includes('completed') || action.includes('COMPLETED')) {
    return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
  }
  if (action.includes('failed') || action.includes('FAILED')) {
    return 'text-red-500 bg-red-100 dark:bg-red-900/30';
  }
  if (action.includes('updated') || action.includes('UPDATE')) {
    return 'text-amber-500 bg-amber-100 dark:bg-amber-900/30';
  }
  if (action.includes('deleted') || action.includes('DELETE')) {
    return 'text-red-500 bg-red-100 dark:bg-red-900/30';
  }
  return 'text-gray-500 bg-gray-100 dark:bg-gray-700';
};

export function ActivityFeed({
  activities,
  title = 'Recent Activity',
  className = '',
  showUser = true,
}: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No recent activity
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div className="flow-root">
        <ul className="-mb-8">
          {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.action);
            const isLast = index === activities.length - 1;

            return (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {!isLast && (
                    <span
                      className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex items-start space-x-3">
                    <div className={`relative p-2 rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {activity.title}
                        </span>
                        <span className="ml-2 text-gray-500 dark:text-gray-400">
                          {activity.action}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {showUser && activity.userEmail && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {activity.userEmail}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default ActivityFeed;

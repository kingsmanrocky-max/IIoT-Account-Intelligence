'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="mt-2 flex items-center text-sm">
              <span
                className={`font-medium ${
                  trend.isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;

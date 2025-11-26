'use client';

import React from 'react';
import { Schedule, WorkflowType } from '@/lib/api';
import { Play, Pause, Trash2, Edit2, Clock, Calendar } from 'lucide-react';

interface ScheduleCardProps {
  schedule: Schedule;
  onClick?: (schedule: Schedule) => void;
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (schedule: Schedule) => void;
  onActivate?: (schedule: Schedule) => void;
  onDeactivate?: (schedule: Schedule) => void;
  onTrigger?: (schedule: Schedule) => void;
}

const workflowLabels: Record<WorkflowType, string> = {
  ACCOUNT_INTELLIGENCE: 'Account Intelligence',
  COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence',
  NEWS_DIGEST: 'News Digest',
};

const workflowColors: Record<WorkflowType, { bg: string; text: string }> = {
  ACCOUNT_INTELLIGENCE: { bg: 'bg-meraki-blue/10', text: 'text-meraki-blue' },
  COMPETITIVE_INTELLIGENCE: { bg: 'bg-purple-100', text: 'text-purple-700' },
  NEWS_DIGEST: { bg: 'bg-green-100', text: 'text-green-700' },
};

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function describeCron(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const hourNum = parseInt(hour, 10);
  const timeStr = hourNum === 0 ? '12:00 AM' : hourNum < 12 ? `${hourNum}:00 AM` : hourNum === 12 ? '12:00 PM' : `${hourNum - 12}:00 PM`;

  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${timeStr}`;
  }

  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[parseInt(dayOfWeek, 10)] || dayOfWeek;
    return `Weekly on ${dayName} at ${timeStr}`;
  }

  if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
    return `Monthly on day ${dayOfMonth} at ${timeStr}`;
  }

  return cron;
}

export default function ScheduleCard({
  schedule,
  onClick,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onTrigger,
}: ScheduleCardProps) {
  const templateType = schedule.template?.workflowType || 'ACCOUNT_INTELLIGENCE';
  const workflowColor = workflowColors[templateType];

  return (
    <div
      className="bg-white border border-meraki-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(schedule)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-meraki-gray-900 line-clamp-1">{schedule.name}</h3>
            {schedule.isActive ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-meraki-gray-100 text-meraki-gray-600">
                Paused
              </span>
            )}
          </div>
          {schedule.template && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${workflowColor.bg} ${workflowColor.text}`}>
              {workflowLabels[templateType]}
            </span>
          )}
        </div>
        {/* Schedule icon */}
        <div className="p-1.5 bg-meraki-gray-50 rounded-lg text-meraki-gray-400">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {schedule.description && (
        <p className="text-sm text-meraki-gray-600 mb-3 line-clamp-2">
          {schedule.description}
        </p>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex items-center text-meraki-gray-600">
          <span className="w-20 text-meraki-gray-400">Schedule:</span>
          <span className="truncate">{describeCron(schedule.cronExpression)}</span>
        </div>
        {schedule.template && (
          <div className="flex items-center text-meraki-gray-600">
            <span className="w-20 text-meraki-gray-400">Template:</span>
            <span className="truncate">{schedule.template.name}</span>
          </div>
        )}
        <div className="flex items-center text-meraki-gray-600">
          <span className="w-20 text-meraki-gray-400">Next run:</span>
          <span>{formatDate(schedule.nextRunAt)}</span>
        </div>
        {schedule.lastRunAt && (
          <div className="flex items-center text-meraki-gray-600">
            <span className="w-20 text-meraki-gray-400">Last run:</span>
            <span>{formatDate(schedule.lastRunAt)}</span>
          </div>
        )}
        <div className="flex items-center text-meraki-gray-600">
          <span className="w-20 text-meraki-gray-400">Delivery:</span>
          <span>{schedule.deliveryMethod === 'WEBEX' ? 'Webex' : 'Download'}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-meraki-gray-100">
        {onTrigger && schedule.isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTrigger(schedule);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-meraki-blue rounded-lg hover:bg-meraki-blue/90 transition-colors"
            title="Run now"
          >
            <Play className="w-4 h-4" />
            Run Now
          </button>
        )}
        {schedule.isActive && onDeactivate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeactivate(schedule);
            }}
            className="px-3 py-1.5 text-sm font-medium text-meraki-gray-700 bg-meraki-gray-100 rounded-lg hover:bg-meraki-gray-200 transition-colors"
            title="Pause schedule"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
        {!schedule.isActive && onActivate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActivate(schedule);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
            title="Activate schedule"
          >
            <Play className="w-4 h-4" />
            Activate
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(schedule);
            }}
            className="px-3 py-1.5 text-sm font-medium text-meraki-gray-700 bg-meraki-gray-100 rounded-lg hover:bg-meraki-gray-200 transition-colors"
            title="Edit schedule"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(schedule);
            }}
            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            title="Delete schedule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, User, Clock, FileText } from 'lucide-react';
import type { WebexInteraction } from '@/lib/api';

interface WebexInteractionFeedProps {
  interactions: WebexInteraction[];
  title?: string;
  className?: string;
}

const getResponseTypeIcon = (responseType: string) => {
  switch (responseType) {
    case 'REPORT_CREATED':
      return CheckCircle;
    case 'ERROR':
    case 'INVALID_COMPANY':
      return XCircle;
    case 'RATE_LIMITED':
      return AlertCircle;
    default:
      return MessageSquare;
  }
};

const getResponseTypeColor = (responseType: string, success: boolean) => {
  if (success || responseType === 'REPORT_CREATED') {
    return 'text-green-500 bg-green-100 dark:bg-green-900/30';
  }
  if (responseType === 'ERROR' || responseType === 'INVALID_COMPANY') {
    return 'text-red-500 bg-red-100 dark:bg-red-900/30';
  }
  if (responseType === 'RATE_LIMITED') {
    return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30';
  }
  return 'text-gray-500 bg-gray-100 dark:bg-gray-700';
};

const getWorkflowBadgeColor = (workflowType?: string) => {
  switch (workflowType) {
    case 'ACCOUNT_INTELLIGENCE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'COMPETITIVE_INTELLIGENCE':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'NEWS_DIGEST':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const formatWorkflowType = (workflowType?: string) => {
  if (!workflowType) return 'N/A';
  return workflowType
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export function WebexInteractionFeed({
  interactions,
  title = 'Webex Bot Interactions',
  className = '',
}: WebexInteractionFeedProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!interactions || interactions.length === 0) {
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
          No Webex interactions found
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
          {interactions.map((interaction, index) => {
            const Icon = getResponseTypeIcon(interaction.responseType);
            const colorClass = getResponseTypeColor(interaction.responseType, interaction.success);
            const isLast = index === interactions.length - 1;
            const isExpanded = expandedIds.has(interaction.id);

            return (
              <li key={interaction.id}>
                <div className="relative pb-8">
                  {!isLast && (
                    <span
                      className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex items-start space-x-3">
                    <div className={`relative p-2 rounded-full ${colorClass} flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {interaction.userEmail}
                            </span>
                            {interaction.targetCompany && (
                              <span className="ml-2 text-gray-500 dark:text-gray-400">
                                requested report for {interaction.targetCompany}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center flex-wrap gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(interaction.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                            {interaction.workflowType && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getWorkflowBadgeColor(interaction.workflowType)}`}>
                                {formatWorkflowType(interaction.workflowType)}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${interaction.success ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                              {interaction.responseType.replace(/_/g, ' ')}
                            </span>
                            {interaction.reportId && (
                              <span className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <FileText className="h-3 w-3" />
                                Report Created
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleExpand(interaction.id)}
                          className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      </div>

                      {/* Message Preview */}
                      {!isExpanded && interaction.messageText && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {interaction.messageText}
                        </p>
                      )}

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 space-y-3 text-sm">
                          {interaction.messageText && (
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                User Message:
                              </p>
                              <p className="text-gray-900 dark:text-gray-100">
                                {interaction.messageText}
                              </p>
                            </div>
                          )}

                          {interaction.responseText && (
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Bot Response:
                              </p>
                              <p className="text-gray-900 dark:text-gray-100">
                                {interaction.responseText}
                              </p>
                            </div>
                          )}

                          {interaction.additionalData && Object.keys(interaction.additionalData).length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Additional Data:
                              </p>
                              <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                                {JSON.stringify(interaction.additionalData, null, 2)}
                              </pre>
                            </div>
                          )}

                          {interaction.errorMessage && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                              <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                                Error:
                              </p>
                              <p className="text-red-900 dark:text-red-200">
                                {interaction.errorMessage}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
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

export default WebexInteractionFeed;

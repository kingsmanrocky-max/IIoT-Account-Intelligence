'use client';

import React from 'react';
import { Report, ReportStatus, WorkflowType } from '@/lib/api';

interface ReportCardProps {
  report: Report;
  onClick?: (report: Report) => void;
  onRetry?: (report: Report) => void;
  onDelete?: (report: Report) => void;
}

const statusColors: Record<ReportStatus, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  PROCESSING: { bg: 'bg-meraki-blue/10', text: 'text-meraki-blue', dot: 'bg-meraki-blue animate-pulse' },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
};

const workflowLabels: Record<WorkflowType, string> = {
  ACCOUNT_INTELLIGENCE: 'Account Intelligence',
  COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence',
  NEWS_DIGEST: 'News Digest',
};

const workflowIcons: Record<WorkflowType, React.ReactNode> = {
  ACCOUNT_INTELLIGENCE: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  COMPETITIVE_INTELLIGENCE: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  NEWS_DIGEST: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReportCard({ report, onClick, onRetry, onDelete }: ReportCardProps) {
  const status = statusColors[report.status];
  const workflowLabel = workflowLabels[report.workflowType];
  const workflowIcon = workflowIcons[report.workflowType];

  const companyDisplay = report.inputData.companyName
    || (report.inputData.companyNames?.length ? report.inputData.companyNames.join(', ') : 'N/A');

  return (
    <div
      className="bg-white border border-meraki-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(report)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-meraki-gray-100 rounded-lg text-meraki-midnight">
            {workflowIcon}
          </div>
          <div>
            <h3 className="font-medium text-meraki-gray-900 line-clamp-1">{report.title}</h3>
            <p className="text-sm text-meraki-gray-500">{workflowLabel}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {report.status}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center text-meraki-gray-600">
          <span className="w-20 text-meraki-gray-400">Company:</span>
          <span className="truncate">{companyDisplay}</span>
        </div>
        <div className="flex items-center text-meraki-gray-600">
          <span className="w-20 text-meraki-gray-400">Created:</span>
          <span>{formatDate(report.createdAt)}</span>
        </div>
        {report.analytics && (
          <div className="flex items-center text-meraki-gray-600">
            <span className="w-20 text-meraki-gray-400">Tokens:</span>
            <span>{report.analytics.tokensUsed.toLocaleString()}</span>
          </div>
        )}
      </div>

      {(report.status === 'FAILED' || report.status === 'COMPLETED') && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-meraki-gray-100">
          {report.status === 'FAILED' && onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry(report);
              }}
              className="flex-1 px-3 py-1.5 text-sm font-medium text-meraki-blue bg-meraki-blue/10 rounded-lg hover:bg-meraki-blue/20 transition-colors"
            >
              Retry
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(report);
              }}
              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { Template, WorkflowType } from '@/lib/api';

interface TemplateCardProps {
  template: Template;
  onClick?: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onDuplicate?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  onApply?: (template: Template) => void;
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
  });
}

function getConfigSummary(template: Template): string[] {
  const summary: string[] = [];
  const config = template.configuration;

  if (!config) {
    return summary;
  }

  if (config.sections?.length) {
    summary.push(`${config.sections.length} sections`);
  }

  if (config.depth) {
    summary.push(`${config.depth} depth`);
  }

  if (config.requestedFormats?.length) {
    summary.push(config.requestedFormats.join(', '));
  }

  // News Digest options
  if (config.newsDigestOptions) {
    const nd = config.newsDigestOptions;
    if (nd.timePeriod) {
      summary.push(nd.timePeriod.replace('-', ' '));
    }
    if (nd.newsFocus && nd.newsFocus.length > 0) {
      summary.push(`${nd.newsFocus.length} topics`);
    }
    if (nd.outputStyle) {
      summary.push(nd.outputStyle);
    }
  }

  if (config.podcastOptions?.enabled) {
    summary.push('Podcast');
  }

  if (config.delivery) {
    summary.push('Webex delivery');
  }

  return summary;
}

const defaultWorkflowColor = { bg: 'bg-meraki-gray-100', text: 'text-meraki-gray-700' };
const defaultWorkflowIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default function TemplateCard({
  template,
  onClick,
  onEdit,
  onDuplicate,
  onDelete,
  onApply,
}: TemplateCardProps) {
  const workflowLabel = workflowLabels[template.workflowType] || template.workflowType || 'Unknown';
  const workflowColor = workflowColors[template.workflowType] || defaultWorkflowColor;
  const workflowIcon = workflowIcons[template.workflowType] || defaultWorkflowIcon;
  const configSummary = getConfigSummary(template);

  return (
    <div
      className="bg-white border border-meraki-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(template)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-meraki-gray-100 rounded-lg text-meraki-midnight">
            {workflowIcon}
          </div>
          <div>
            <h3 className="font-medium text-meraki-gray-900 line-clamp-1">{template.name}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${workflowColor.bg} ${workflowColor.text}`}>
              {workflowLabel}
            </span>
          </div>
        </div>
        {/* Template icon indicator */}
        <div className="p-1.5 bg-meraki-gray-50 rounded-lg text-meraki-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
      </div>

      {template.description && (
        <p className="text-sm text-meraki-gray-600 mb-3 line-clamp-2">
          {template.description}
        </p>
      )}

      <div className="space-y-2 text-sm">
        {configSummary.length > 0 && (
          <div className="flex items-center text-meraki-gray-600">
            <span className="w-20 text-meraki-gray-400">Config:</span>
            <span className="truncate">{configSummary.join(' | ')}</span>
          </div>
        )}
        <div className="flex items-center text-meraki-gray-600">
          <span className="w-20 text-meraki-gray-400">Updated:</span>
          <span>{formatDate(template.updatedAt)}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-meraki-gray-100">
        {onApply && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply(template);
            }}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-meraki-blue rounded-lg hover:bg-meraki-blue/90 transition-colors"
          >
            Use Template
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(template);
            }}
            className="px-3 py-1.5 text-sm font-medium text-meraki-gray-700 bg-meraki-gray-100 rounded-lg hover:bg-meraki-gray-200 transition-colors"
          >
            Edit
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(template);
            }}
            className="px-3 py-1.5 text-sm font-medium text-meraki-gray-700 bg-meraki-gray-100 rounded-lg hover:bg-meraki-gray-200 transition-colors"
            title="Duplicate template"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(template);
            }}
            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            title="Delete template"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

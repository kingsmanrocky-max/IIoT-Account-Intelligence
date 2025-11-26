'use client';

import { useState } from 'react';
import { Mic } from 'lucide-react';
import { WorkflowType, CreateReportInput, ReportFormat, DepthPreference, CompetitiveIntelligenceOptions, WebexDeliveryInput, PodcastOptions } from '@/lib/api';
import SectionSelector from './SectionSelector';
import DepthSelector from './DepthSelector';
import ProductSelector from './ProductSelector';
import FocusAreaSelector from './FocusAreaSelector';
import WebexDeliverySelector from './WebexDeliverySelector';
import { PodcastOptionsPanel } from '@/components/podcast';
import { WebexDeliveryOptions, DEFAULT_WEBEX_DELIVERY, validateWebexDestination } from '@/lib/constants/webex-delivery';

interface CreateReportFormProps {
  onSubmit: (data: CreateReportInput) => Promise<void>;
  isLoading?: boolean;
}

const workflowOptions: { value: WorkflowType; label: string; description: string }[] = [
  {
    value: 'ACCOUNT_INTELLIGENCE',
    label: 'Account Intelligence',
    description: 'Comprehensive analysis of a target account including company overview, financial health, security events, and current news.',
  },
  {
    value: 'COMPETITIVE_INTELLIGENCE',
    label: 'Competitive Intelligence',
    description: 'In-depth competitor analysis with positioning, strengths/weaknesses, and sales recommendations.',
  },
  {
    value: 'NEWS_DIGEST',
    label: 'News Digest',
    description: 'Executive news brief covering multiple companies with narrative storytelling format.',
  },
];

export default function CreateReportForm({ onSubmit, isLoading = false }: CreateReportFormProps) {
  const [title, setTitle] = useState('');
  const [workflowType, setWorkflowType] = useState<WorkflowType>('ACCOUNT_INTELLIGENCE');
  const [companyName, setCompanyName] = useState('');
  const [companyNames, setCompanyNames] = useState('');
  const [requestedFormats, setRequestedFormats] = useState<ReportFormat[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [depth, setDepth] = useState<DepthPreference>('standard');
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [focusIndustry, setFocusIndustry] = useState<string | null>(null);
  const [webexDelivery, setWebexDelivery] = useState<WebexDeliveryOptions>(DEFAULT_WEBEX_DELIVERY);
  const [includePodcast, setIncludePodcast] = useState(false);
  const [podcastOptions, setPodcastOptions] = useState<PodcastOptions>({
    template: 'EXECUTIVE_BRIEF',
    duration: 'STANDARD',
  });

  const isNewsDigest = workflowType === 'NEWS_DIGEST';
  const isCompetitiveIntelligence = workflowType === 'COMPETITIVE_INTELLIGENCE';

  const toggleFormat = (format: ReportFormat) => {
    setRequestedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Please enter a report title');
      return;
    }

    // Validate Webex delivery if enabled
    if (webexDelivery.enabled) {
      const validation = validateWebexDestination(webexDelivery.destination, webexDelivery.destinationType);
      if (!validation.valid) {
        setError(validation.error || 'Invalid Webex delivery destination');
        return;
      }
    }

    // Build delivery input if enabled
    const delivery: WebexDeliveryInput | undefined = webexDelivery.enabled
      ? {
          method: 'WEBEX',
          destination: webexDelivery.destination,
          destinationType: webexDelivery.destinationType,
          contentType: webexDelivery.contentType,
          format: webexDelivery.contentType === 'ATTACHMENT' ? (requestedFormats[0] || 'PDF') : undefined,
        }
      : undefined;

    if (isNewsDigest) {
      const names = companyNames.split(',').map((n) => n.trim()).filter(Boolean);
      if (names.length === 0) {
        setError('Please enter at least one company name');
        return;
      }
      await onSubmit({
        title: title.trim(),
        workflowType,
        companyNames: names,
        requestedFormats: requestedFormats.length > 0 ? requestedFormats : undefined,
        sections: selectedSections.length > 0 ? selectedSections : undefined,
        depth,
        delivery,
        podcastOptions: includePodcast ? podcastOptions : undefined,
      });
    } else {
      if (!companyName.trim()) {
        setError('Please enter a company name');
        return;
      }

      // Build competitiveOptions for CI workflow
      const competitiveOptions: CompetitiveIntelligenceOptions | undefined =
        isCompetitiveIntelligence && (selectedProducts.length > 0 || focusIndustry)
          ? {
              selectedProducts,
              focusIndustry: focusIndustry || undefined,
            }
          : undefined;

      await onSubmit({
        title: title.trim(),
        workflowType,
        companyName: companyName.trim(),
        requestedFormats: requestedFormats.length > 0 ? requestedFormats : undefined,
        sections: selectedSections.length > 0 ? selectedSections : undefined,
        depth,
        competitiveOptions,
        delivery,
        podcastOptions: includePodcast ? podcastOptions : undefined,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Report Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
          Report Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Q4 Competitor Analysis - Acme Corp"
          className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          disabled={isLoading}
        />
      </div>

      {/* Workflow Type */}
      <div>
        <label className="block text-sm font-medium text-meraki-gray-700 mb-3">
          Report Type
        </label>
        <div className="grid gap-3">
          {workflowOptions.map((option) => (
            <label
              key={option.value}
              className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                workflowType === option.value
                  ? 'border-meraki-blue bg-meraki-blue/5'
                  : 'border-meraki-gray-200 hover:border-meraki-gray-300'
              }`}
            >
              <input
                type="radio"
                name="workflowType"
                value={option.value}
                checked={workflowType === option.value}
                onChange={(e) => setWorkflowType(e.target.value as WorkflowType)}
                className="sr-only"
                disabled={isLoading}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      workflowType === option.value
                        ? 'border-meraki-blue'
                        : 'border-meraki-gray-300'
                    }`}
                  >
                    {workflowType === option.value && (
                      <div className="w-2 h-2 rounded-full bg-meraki-blue" />
                    )}
                  </div>
                  <span className="font-medium text-meraki-gray-900">{option.label}</span>
                </div>
                <p className="mt-1 text-sm text-meraki-gray-500 pl-6">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Company Input */}
      <div>
        <label
          htmlFor="company"
          className="block text-sm font-medium text-meraki-gray-700 mb-1.5"
        >
          {isNewsDigest ? 'Company Names (comma-separated)' : 'Company Name'}
        </label>
        {isNewsDigest ? (
          <textarea
            id="company"
            value={companyNames}
            onChange={(e) => setCompanyNames(e.target.value)}
            placeholder="e.g., Microsoft, Google, Amazon"
            rows={3}
            className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent resize-none"
            disabled={isLoading}
          />
        ) : (
          <input
            type="text"
            id="company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Acme Corporation"
            className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
            disabled={isLoading}
          />
        )}
        <p className="mt-1.5 text-xs text-meraki-gray-400">
          {isNewsDigest
            ? 'Enter multiple company names separated by commas'
            : 'Enter the official company name for best results'}
        </p>
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-meraki-blue hover:text-meraki-blue-dark transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-6 p-4 bg-meraki-gray-50 rounded-lg border border-meraki-gray-200">
          {/* Competitive Intelligence Options */}
          {isCompetitiveIntelligence && (
            <>
              <ProductSelector
                selectedProducts={selectedProducts}
                onProductsChange={setSelectedProducts}
                disabled={isLoading}
              />
              <FocusAreaSelector
                selectedIndustry={focusIndustry}
                onIndustryChange={setFocusIndustry}
                disabled={isLoading}
              />
            </>
          )}

          {/* Section Selector */}
          <SectionSelector
            workflowType={workflowType}
            selectedSections={selectedSections}
            onSectionsChange={setSelectedSections}
            disabled={isLoading}
          />

          {/* Depth Selector */}
          <DepthSelector
            value={depth}
            onChange={setDepth}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Export Formats */}
      <div>
        <label className="block text-sm font-medium text-meraki-gray-700 mb-3">
          Export Formats (optional)
        </label>
        <p className="text-xs text-meraki-gray-400 mb-3">
          Select formats to pre-generate. You can also download later.
        </p>
        <div className="flex gap-3">
          <label
            className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
              requestedFormats.includes('PDF')
                ? 'border-meraki-blue bg-meraki-blue/5'
                : 'border-meraki-gray-200 hover:border-meraki-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={requestedFormats.includes('PDF')}
              onChange={() => toggleFormat('PDF')}
              className="sr-only"
              disabled={isLoading}
            />
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-meraki-gray-700">PDF</span>
            {requestedFormats.includes('PDF') && (
              <svg className="w-4 h-4 text-meraki-blue ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </label>
          <label
            className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
              requestedFormats.includes('DOCX')
                ? 'border-meraki-blue bg-meraki-blue/5'
                : 'border-meraki-gray-200 hover:border-meraki-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={requestedFormats.includes('DOCX')}
              onChange={() => toggleFormat('DOCX')}
              className="sr-only"
              disabled={isLoading}
            />
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-meraki-gray-700">Word</span>
            {requestedFormats.includes('DOCX') && (
              <svg className="w-4 h-4 text-meraki-blue ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </label>
        </div>
      </div>

      {/* Virtual Podcast Option */}
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includePodcast}
            onChange={(e) => setIncludePodcast(e.target.checked)}
            className="w-4 h-4 text-meraki-blue border-meraki-gray-300 rounded focus:ring-meraki-blue"
            disabled={isLoading}
          />
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-meraki-gray-500" />
            <span className="text-sm font-medium text-meraki-gray-700">
              Generate Virtual Podcast
            </span>
          </div>
          <span className="text-xs text-meraki-gray-500">
            AI-generated audio discussion of the report
          </span>
        </label>

        {includePodcast && (
          <PodcastOptionsPanel
            options={podcastOptions}
            onChange={setPodcastOptions}
            disabled={isLoading}
          />
        )}
      </div>

      {/* Webex Delivery */}
      <div className="p-4 bg-meraki-gray-50 rounded-lg border border-meraki-gray-200">
        <WebexDeliverySelector
          value={webexDelivery}
          onChange={setWebexDelivery}
          disabled={isLoading}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-meraki-blue text-white font-medium rounded-lg hover:bg-meraki-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating Report...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Report
          </>
        )}
      </button>
    </form>
  );
}

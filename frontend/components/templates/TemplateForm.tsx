'use client';

import { useState, useEffect } from 'react';
import {
  WorkflowType,
  CreateTemplateInput,
  UpdateTemplateInput,
  Template,
  ReportFormat,
  DepthPreference,
  TemplateConfiguration,
} from '@/lib/api';
import SectionSelector from '../reports/SectionSelector';
import DepthSelector from '../reports/DepthSelector';
import ProductSelector from '../reports/ProductSelector';
import FocusAreaSelector from '../reports/FocusAreaSelector';
import WebexDeliverySelector from '../reports/WebexDeliverySelector';
import NewsFocusSelector from '../reports/NewsFocusSelector';
import TimePeriodSelector from '../reports/TimePeriodSelector';
import OutputStyleSelector from '../reports/OutputStyleSelector';
import { WebexDeliveryOptions, DEFAULT_WEBEX_DELIVERY, validateWebexDestination } from '@/lib/constants/webex-delivery';
import { DEFAULT_TIME_PERIOD, DEFAULT_OUTPUT_STYLE } from '@/lib/constants/news-digest';
import { PodcastOptionsPanel } from '../podcast/PodcastOptionsPanel';
import { PodcastOptions } from '@/lib/api';

interface TemplateFormProps {
  template?: Template;
  onSubmit: (data: CreateTemplateInput | UpdateTemplateInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const workflowOptions: { value: WorkflowType; label: string; description: string }[] = [
  {
    value: 'ACCOUNT_INTELLIGENCE',
    label: 'Account Intelligence',
    description: 'Comprehensive analysis of a target account.',
  },
  {
    value: 'COMPETITIVE_INTELLIGENCE',
    label: 'Competitive Intelligence',
    description: 'In-depth competitor analysis with positioning.',
  },
  {
    value: 'NEWS_DIGEST',
    label: 'News Digest',
    description: 'Executive news brief covering multiple companies.',
  },
];

export default function TemplateForm({ template, onSubmit, onCancel, isLoading = false }: TemplateFormProps) {
  const isEdit = !!template;

  // Basic fields
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [workflowType, setWorkflowType] = useState<WorkflowType>(template?.workflowType || 'ACCOUNT_INTELLIGENCE');

  // Configuration fields
  const [requestedFormats, setRequestedFormats] = useState<ReportFormat[]>(template?.configuration?.requestedFormats || []);
  const [selectedSections, setSelectedSections] = useState<string[]>(template?.configuration?.sections || []);
  const [depth, setDepth] = useState<DepthPreference>(template?.configuration?.depth || 'standard');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(template?.configuration?.competitiveOptions?.selectedProducts || []);
  const [focusIndustry, setFocusIndustry] = useState<string | null>(template?.configuration?.competitiveOptions?.focusIndustry || null);

  // Webex delivery
  const [webexDelivery, setWebexDelivery] = useState<WebexDeliveryOptions>(() => {
    if (template?.configuration?.delivery) {
      const d = template.configuration.delivery;
      return {
        enabled: true,
        destination: d.destination,
        destinationType: d.destinationType,
        contentType: d.contentType,
      };
    }
    return DEFAULT_WEBEX_DELIVERY;
  });

  // Podcast options
  const [podcastEnabled, setPodcastEnabled] = useState<boolean>(template?.configuration?.podcastOptions?.enabled || false);
  const [podcastOptions, setPodcastOptions] = useState<PodcastOptions>(() => {
    const opts = template?.configuration?.podcastOptions;
    return {
      template: opts?.template || 'EXECUTIVE_BRIEF',
      duration: opts?.duration || 'STANDARD',
      deliveryEnabled: opts?.deliveryEnabled || false,
      deliveryDestination: opts?.deliveryDestination || '',
      deliveryDestinationType: opts?.deliveryDestinationType || 'email',
    };
  });

  // News Digest options
  const [newsFocus, setNewsFocus] = useState<string[]>(template?.configuration?.newsDigestOptions?.newsFocus || []);
  const [timePeriod, setTimePeriod] = useState(template?.configuration?.newsDigestOptions?.timePeriod || DEFAULT_TIME_PERIOD);
  const [industryFilter, setIndustryFilter] = useState<string | null>(template?.configuration?.newsDigestOptions?.industryFilter || null);
  const [outputStyle, setOutputStyle] = useState(template?.configuration?.newsDigestOptions?.outputStyle || DEFAULT_OUTPUT_STYLE);

  const [error, setError] = useState<string | null>(null);

  const isCompetitiveIntelligence = workflowType === 'COMPETITIVE_INTELLIGENCE';
  const isNewsDigest = workflowType === 'NEWS_DIGEST';

  // Reset CI-specific fields when workflow changes
  useEffect(() => {
    if (!isCompetitiveIntelligence) {
      setSelectedProducts([]);
      setFocusIndustry(null);
    }
  }, [isCompetitiveIntelligence]);

  // Reset News Digest fields when workflow changes
  useEffect(() => {
    if (!isNewsDigest) {
      setNewsFocus([]);
      setTimePeriod(DEFAULT_TIME_PERIOD);
      setIndustryFilter(null);
      setOutputStyle(DEFAULT_OUTPUT_STYLE);
    }
  }, [isNewsDigest]);

  const toggleFormat = (format: ReportFormat) => {
    setRequestedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Please enter a template name');
      return;
    }

    if (name.length > 200) {
      setError('Template name must be 200 characters or less');
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

    // Build configuration
    const configuration: TemplateConfiguration = {};

    if (selectedSections.length > 0) {
      configuration.sections = selectedSections;
    }

    if (depth !== 'standard') {
      configuration.depth = depth;
    }

    if (requestedFormats.length > 0) {
      configuration.requestedFormats = requestedFormats;
    }

    if (isCompetitiveIntelligence && (selectedProducts.length > 0 || focusIndustry)) {
      configuration.competitiveOptions = {
        selectedProducts,
        focusIndustry: focusIndustry || undefined,
      };
    }

    if (isNewsDigest) {
      configuration.newsDigestOptions = {
        newsFocus: newsFocus.length > 0 ? newsFocus : undefined,
        timePeriod: timePeriod !== DEFAULT_TIME_PERIOD ? timePeriod : undefined,
        industryFilter: industryFilter || undefined,
        outputStyle: outputStyle !== DEFAULT_OUTPUT_STYLE ? outputStyle : undefined,
      };
    }

    if (webexDelivery.enabled) {
      configuration.delivery = {
        method: 'WEBEX',
        destination: webexDelivery.destination,
        destinationType: webexDelivery.destinationType,
        contentType: webexDelivery.contentType,
        format: webexDelivery.contentType === 'ATTACHMENT' ? (requestedFormats[0] || 'PDF') : undefined,
      };
    }

    if (podcastEnabled) {
      configuration.podcastOptions = {
        enabled: true,
        template: podcastOptions.template,
        duration: podcastOptions.duration,
        deliveryEnabled: podcastOptions.deliveryEnabled,
        deliveryDestination: podcastOptions.deliveryDestination,
        deliveryDestinationType: podcastOptions.deliveryDestinationType,
      };
    }

    if (isEdit) {
      // Update template
      const data: UpdateTemplateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        configuration,
      };
      await onSubmit(data);
    } else {
      // Create template
      const data: CreateTemplateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        workflowType,
        configuration,
      };
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Template Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
          Template Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Weekly Competitor Analysis"
          className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          disabled={isLoading}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this template is used for..."
          rows={2}
          className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent resize-none"
          disabled={isLoading}
        />
      </div>

      {/* Workflow Type - only shown when creating */}
      {!isEdit && (
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
      )}

      {/* Configuration Section */}
      <div className="space-y-6 p-4 bg-meraki-gray-50 rounded-lg border border-meraki-gray-200">
        <h3 className="text-sm font-medium text-meraki-gray-900">Template Configuration</h3>

        {/* Competitive Intelligence Options */}
        {isCompetitiveIntelligence && (
          <div className="space-y-6">
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
          </div>
        )}

        {/* News Digest Options */}
        {isNewsDigest && (
          <div className="space-y-6">
            <NewsFocusSelector
              selectedFocus={newsFocus}
              onFocusChange={setNewsFocus}
              disabled={isLoading}
            />
            <TimePeriodSelector
              value={timePeriod}
              onChange={setTimePeriod}
              disabled={isLoading}
            />
            <div>
              <label className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                Industry Filter (optional)
              </label>
              <FocusAreaSelector
                selectedIndustry={industryFilter}
                onIndustryChange={setIndustryFilter}
                disabled={isLoading}
              />
            </div>
            <OutputStyleSelector
              value={outputStyle}
              onChange={setOutputStyle}
              disabled={isLoading}
            />
          </div>
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

      {/* Export Formats */}
      <div>
        <label className="block text-sm font-medium text-meraki-gray-700 mb-3">
          Default Export Formats
        </label>
        <p className="text-xs text-meraki-gray-400 mb-3">
          These formats will be generated when using this template.
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

      {/* Virtual Podcast Generation */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={podcastEnabled}
            onChange={(e) => setPodcastEnabled(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 text-meraki-blue border-meraki-gray-300 rounded focus:ring-2 focus:ring-meraki-blue"
          />
          <span className="text-sm font-medium text-meraki-gray-700">
            Generate Virtual Podcast
          </span>
        </label>
        {podcastEnabled && (
          <div className="mt-3">
            <PodcastOptionsPanel
              options={podcastOptions}
              onChange={setPodcastOptions}
              disabled={isLoading}
            />
          </div>
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

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-meraki-gray-100 text-meraki-gray-700 font-medium rounded-lg hover:bg-meraki-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-3 px-4 bg-meraki-blue text-white font-medium rounded-lg hover:bg-meraki-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {isEdit ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isEdit ? 'Save Changes' : 'Create Template'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

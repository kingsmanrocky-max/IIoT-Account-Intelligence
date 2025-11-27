'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ReportCard, ReportViewer, SectionSelector, DepthSelector, ProductSelector, FocusAreaSelector, WebexDeliverySelector } from '@/components/reports';
import { PodcastOptionsPanel } from '@/components/podcast';
import { reportsAPI, Report, CreateReportInput, ReportFormat, DepthPreference, CompetitiveIntelligenceOptions, WebexDeliveryInput, PodcastOptions } from '@/lib/api';
import { WebexDeliveryOptions, DEFAULT_WEBEX_DELIVERY, validateWebexDestination } from '@/lib/constants/webex-delivery';
import { ArrowRight, ArrowLeft, Target, Check, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

type Step = 'competitor' | 'products' | 'industry' | 'advanced' | 'generate';

const STEPS: { key: Step; label: string; description: string }[] = [
  { key: 'competitor', label: 'Competitor', description: 'Enter competitor company name' },
  { key: 'products', label: 'Products', description: 'Select Cisco products to compare' },
  { key: 'industry', label: 'Industry', description: 'Choose industry focus (optional)' },
  { key: 'advanced', label: 'Options', description: 'Sections, depth & export formats' },
  { key: 'generate', label: 'Generate', description: 'Review and generate report' },
];

export default function CompetitiveIntelligencePage() {
  const router = useRouter();

  // Form state
  const [currentStep, setCurrentStep] = useState<Step>('competitor');
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [focusIndustry, setFocusIndustry] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [depth, setDepth] = useState<DepthPreference>('standard');
  const [requestedFormats, setRequestedFormats] = useState<ReportFormat[]>([]);
  const [webexDelivery, setWebexDelivery] = useState<WebexDeliveryOptions>(DEFAULT_WEBEX_DELIVERY);
  const [includePodcast, setIncludePodcast] = useState(false);
  const [podcastOptions, setPodcastOptions] = useState<PodcastOptions>({
    template: 'EXECUTIVE_BRIEF',
    duration: 'STANDARD',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [showRecentReports, setShowRecentReports] = useState(true);

  // Load recent CI reports
  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const response = await reportsAPI.list({
        workflowType: 'COMPETITIVE_INTELLIGENCE',
        limit: 5,
      });
      setReports(response.data.data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Poll for processing reports
  useEffect(() => {
    const processingReports = reports.filter((r) => r.status === 'PROCESSING');
    if (processingReports.length === 0) return;

    const interval = setInterval(async () => {
      for (const report of processingReports) {
        try {
          const response = await reportsAPI.getStatus(report.id);
          if (response.data.data.status !== 'PROCESSING') {
            loadReports();
            break;
          }
        } catch (err) {
          console.error('Failed to check report status:', err);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [reports, loadReports]);

  // Auto-generate title when company name changes
  useEffect(() => {
    if (companyName.trim() && !title) {
      setTitle(`Competitive Analysis - ${companyName.trim()}`);
    }
  }, [companyName, title]);

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'competitor':
        return companyName.trim().length > 0;
      case 'products':
        return true; // Products are optional
      case 'industry':
        return true; // Industry is optional
      case 'advanced':
        return true; // Advanced options have defaults
      case 'generate':
        return title.trim().length > 0 && companyName.trim().length > 0;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
    }
  };

  const goToStep = (step: Step) => {
    const targetIndex = STEPS.findIndex((s) => s.key === step);
    // Can go back to any step, but can only go forward if current step is valid
    if (targetIndex <= currentStepIndex || canProceed()) {
      setCurrentStep(step);
    }
  };

  const toggleFormat = (format: ReportFormat) => {
    setRequestedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      // Validate Webex delivery if enabled
      if (webexDelivery.enabled) {
        const validation = validateWebexDestination(webexDelivery.destination, webexDelivery.destinationType);
        if (!validation.valid) {
          setError(validation.error || 'Invalid Webex delivery destination');
          setIsGenerating(false);
          return;
        }
      }

      const competitiveOptions: CompetitiveIntelligenceOptions | undefined =
        selectedProducts.length > 0 || focusIndustry
          ? {
              selectedProducts,
              focusIndustry: focusIndustry || undefined,
            }
          : undefined;

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

      const input: CreateReportInput = {
        title: title.trim(),
        workflowType: 'COMPETITIVE_INTELLIGENCE',
        companyName: companyName.trim(),
        sections: selectedSections.length > 0 ? selectedSections : undefined,
        depth,
        requestedFormats: requestedFormats.length > 0 ? requestedFormats : undefined,
        competitiveOptions,
        delivery,
        podcastOptions: includePodcast ? podcastOptions : undefined,
      };

      await reportsAPI.create(input);

      // Reset form
      setTitle('');
      setCompanyName('');
      setSelectedProducts([]);
      setFocusIndustry(null);
      setSelectedSections([]);
      setDepth('standard');
      setRequestedFormats([]);
      setWebexDelivery(DEFAULT_WEBEX_DELIVERY);
      setCurrentStep('competitor');

      // Reload reports to show the new one
      loadReports();
    } catch (err) {
      console.error('Failed to create report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewReport = async (report: Report) => {
    try {
      const response = await reportsAPI.get(report.id);
      setSelectedReport(response.data.data);
    } catch (err) {
      console.error('Failed to load report details:', err);
    }
  };

  const handleRetryReport = async (report: Report) => {
    try {
      await reportsAPI.retry(report.id);
      loadReports();
    } catch (err) {
      console.error('Failed to retry report:', err);
    }
  };

  const handleDeleteReport = async (report: Report) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await reportsAPI.delete(report.id);
      if (selectedReport?.id === report.id) {
        setSelectedReport(null);
      }
      loadReports();
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'competitor':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-meraki-gray-700 mb-2">
                Competitor Company Name
              </label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Siemens, Rockwell Automation, Honeywell"
                className="w-full px-4 py-3 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent text-lg"
                autoFocus
              />
              <p className="mt-2 text-sm text-meraki-gray-500">
                Enter the official name of the competitor you want to analyze
              </p>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-meraki-gray-700 mb-2">
                Report Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Q4 Competitive Analysis - Siemens"
                className="w-full px-4 py-3 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-meraki-gray-900 mb-1">
                Cisco IIoT Products to Compare
              </h3>
              <p className="text-sm text-meraki-gray-500 mb-4">
                Select which Cisco product areas to focus the competitive analysis on.
                Skip to use general analysis.
              </p>
            </div>
            <ProductSelector
              selectedProducts={selectedProducts}
              onProductsChange={setSelectedProducts}
            />
          </div>
        );

      case 'industry':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-meraki-gray-900 mb-1">
                Industry Focus
              </h3>
              <p className="text-sm text-meraki-gray-500 mb-4">
                Optionally select an industry vertical to tailor the analysis with
                industry-specific insights and use cases.
              </p>
            </div>
            <FocusAreaSelector
              selectedIndustry={focusIndustry}
              onIndustryChange={setFocusIndustry}
            />
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-6">
            {/* Section Selector */}
            <SectionSelector
              workflowType="COMPETITIVE_INTELLIGENCE"
              selectedSections={selectedSections}
              onSectionsChange={setSelectedSections}
            />

            {/* Depth Selector */}
            <DepthSelector
              value={depth}
              onChange={setDepth}
            />

            {/* Export Formats */}
            <div>
              <label className="block text-sm font-medium text-meraki-gray-700 mb-3">
                Export Formats (optional)
              </label>
              <p className="text-xs text-meraki-gray-400 mb-3">
                Select formats to pre-generate with the report.
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
                  />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-meraki-gray-700">PDF</span>
                  {requestedFormats.includes('PDF') && (
                    <Check className="w-4 h-4 text-meraki-blue ml-auto" />
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
                  />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium text-meraki-gray-700">Word</span>
                  {requestedFormats.includes('DOCX') && (
                    <Check className="w-4 h-4 text-meraki-blue ml-auto" />
                  )}
                </label>
              </div>
            </div>

            {/* Webex Delivery */}
            <div className="p-4 bg-meraki-gray-50 rounded-lg border border-meraki-gray-200">
              <WebexDeliverySelector
                value={webexDelivery}
                onChange={setWebexDelivery}
              />
            </div>

            {/* Virtual Podcast Option */}
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePodcast}
                  onChange={(e) => setIncludePodcast(e.target.checked)}
                  className="w-4 h-4 text-meraki-blue bg-white border-meraki-gray-300 rounded focus:ring-meraki-blue focus:ring-2"
                />
                <span className="text-sm font-medium text-meraki-gray-700">
                  Generate Virtual Podcast
                </span>
              </label>
              {includePodcast && (
                <PodcastOptionsPanel
                  options={podcastOptions}
                  onChange={setPodcastOptions}
                />
              )}
            </div>
          </div>
        );

      case 'generate':
        return (
          <div className="space-y-6">
            <div className="bg-meraki-gray-50 rounded-xl p-6 border border-meraki-gray-200">
              <h3 className="text-lg font-semibold text-meraki-gray-900 mb-4">Report Summary</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-24 text-sm font-medium text-meraki-gray-500">Title</div>
                  <div className="flex-1 text-meraki-gray-900">{title || 'Untitled Report'}</div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-24 text-sm font-medium text-meraki-gray-500">Competitor</div>
                  <div className="flex-1 text-meraki-gray-900">{companyName}</div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-24 text-sm font-medium text-meraki-gray-500">Products</div>
                  <div className="flex-1 text-meraki-gray-900">
                    {selectedProducts.length > 0
                      ? selectedProducts.map(p => p.replace(/-/g, ' ')).join(', ')
                      : 'All Cisco IIoT products'}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-24 text-sm font-medium text-meraki-gray-500">Industry</div>
                  <div className="flex-1 text-meraki-gray-900">
                    {focusIndustry ? focusIndustry.replace(/-/g, ' ') : 'General (all industries)'}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-24 text-sm font-medium text-meraki-gray-500">Depth</div>
                  <div className="flex-1 text-meraki-gray-900 capitalize">{depth}</div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-24 text-sm font-medium text-meraki-gray-500">Sections</div>
                  <div className="flex-1 text-meraki-gray-900">
                    {selectedSections.length > 0
                      ? `${selectedSections.length} selected`
                      : 'All sections'}
                  </div>
                </div>

                {requestedFormats.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-24 text-sm font-medium text-meraki-gray-500">Exports</div>
                    <div className="flex-1 text-meraki-gray-900">{requestedFormats.join(', ')}</div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-meraki-blue/10 rounded-xl">
              <Target className="w-6 h-6 text-meraki-blue" />
            </div>
            <h1 className="text-2xl font-semibold text-meraki-gray-900">
              Competitive Intelligence
            </h1>
          </div>
          <p className="text-sm text-meraki-gray-500">
            Analyze competitors against Cisco&apos;s IIoT portfolio with industry-specific insights
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-meraki-gray-200 shadow-card overflow-hidden">
              {/* Step Indicators */}
              <div className="flex items-center gap-0 border-b border-meraki-gray-200 bg-meraki-gray-50 px-2 py-3 overflow-x-auto">
                {STEPS.map((step, index) => {
                  const isActive = step.key === currentStep;
                  const isCompleted = index < currentStepIndex;
                  const isClickable = index <= currentStepIndex || canProceed();

                  return (
                    <button
                      key={step.key}
                      onClick={() => isClickable && goToStep(step.key)}
                      disabled={!isClickable}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-white text-meraki-blue shadow-sm'
                          : isCompleted
                          ? 'text-meraki-gray-600 hover:bg-white/50'
                          : isClickable
                          ? 'text-meraki-gray-400 hover:bg-white/50'
                          : 'text-meraki-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isActive
                            ? 'bg-meraki-blue text-white'
                            : isCompleted
                            ? 'bg-meraki-blue/20 text-meraki-blue'
                            : 'bg-meraki-gray-200 text-meraki-gray-500'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Step Content */}
              <div className="p-6">
                {renderStepContent()}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between p-6 border-t border-meraki-gray-200 bg-meraki-gray-50">
                <button
                  onClick={prevStep}
                  disabled={currentStepIndex === 0}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-meraki-gray-600 hover:text-meraki-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                {currentStep === 'generate' ? (
                  <button
                    onClick={handleGenerate}
                    disabled={!canProceed() || isGenerating}
                    className="flex items-center gap-2 px-6 py-2.5 bg-meraki-blue text-white font-medium rounded-lg hover:bg-meraki-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Report
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-meraki-blue text-white font-medium rounded-lg hover:bg-meraki-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {currentStep === 'advanced' ? 'Review' : 'Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Recent Reports Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-meraki-gray-200 shadow-card overflow-hidden">
              <button
                onClick={() => setShowRecentReports(!showRecentReports)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-meraki-gray-50 transition-colors"
              >
                <h2 className="text-sm font-semibold text-meraki-gray-900">
                  Recent CI Reports
                </h2>
                {showRecentReports ? (
                  <ChevronUp className="w-4 h-4 text-meraki-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-meraki-gray-400" />
                )}
              </button>

              {showRecentReports && (
                <div className="border-t border-meraki-gray-200">
                  {isLoadingReports ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-5 h-5 text-meraki-gray-400 animate-spin" />
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="p-6 text-center">
                      <Target className="w-8 h-8 text-meraki-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-meraki-gray-500">No CI reports yet</p>
                      <p className="text-xs text-meraki-gray-400 mt-1">
                        Generate your first competitive analysis
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-meraki-gray-100 max-h-96 overflow-y-auto">
                      {reports.map((report) => (
                        <div
                          key={report.id}
                          className="p-4 hover:bg-meraki-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleViewReport(report)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-meraki-gray-900 truncate">
                                {report.title}
                              </p>
                              <p className="text-xs text-meraki-gray-500 mt-0.5">
                                {report.inputData?.companyName}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                                report.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-700'
                                  : report.status === 'PROCESSING'
                                  ? 'bg-blue-100 text-blue-700'
                                  : report.status === 'FAILED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {report.status}
                            </span>
                          </div>
                          <p className="text-xs text-meraki-gray-400 mt-1">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Viewer Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <ReportViewer
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

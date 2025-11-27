'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ReportCard, ReportViewer, DepthSelector, WebexDeliverySelector } from '@/components/reports';
import { PodcastOptionsPanel } from '@/components/podcast';
import { reportsAPI, Report, CreateReportInput, ReportFormat, DepthPreference, WebexDeliveryInput, PodcastOptions } from '@/lib/api';
import { WebexDeliveryOptions, DEFAULT_WEBEX_DELIVERY, validateWebexDestination } from '@/lib/constants/webex-delivery';
import { Building2, Sparkles, RefreshCw, ChevronDown, ChevronUp, Check, Loader2, X } from 'lucide-react';
import { ValidatedCompany } from '@/lib/types/company-validation';

export default function AccountIntelligencePage() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [depth, setDepth] = useState<DepthPreference>('standard');
  const [requestedFormats, setRequestedFormats] = useState<ReportFormat[]>([]);
  const [webexDelivery, setWebexDelivery] = useState<WebexDeliveryOptions>(DEFAULT_WEBEX_DELIVERY);
  const [includePodcast, setIncludePodcast] = useState(false);
  const [podcastOptions, setPodcastOptions] = useState<PodcastOptions>({
    template: 'EXECUTIVE_BRIEF',
    duration: 'STANDARD',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidatedCompany | null>(null);

  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [showRecentReports, setShowRecentReports] = useState(true);

  // Load recent AI reports
  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const response = await reportsAPI.list({
        workflowType: 'ACCOUNT_INTELLIGENCE',
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

  // Auto-generate title when company name is entered (using LLM)
  useEffect(() => {
    const generateTitle = async () => {
      if (companyName && companyName.trim().length > 2) {
        setIsGeneratingTitle(true);
        try {
          const generatedTitle = await reportsAPI.generateTitle('ACCOUNT_INTELLIGENCE', companyName.trim());
          setTitle(generatedTitle);
        } catch (error) {
          // Fallback to static pattern if LLM fails
          const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          setTitle(`Account Intelligence - ${companyName.trim()} - ${dateStr}`);
        } finally {
          setIsGeneratingTitle(false);
        }
      }
    };

    const debounceTimer = setTimeout(generateTitle, 500);  // Debounce to avoid too many API calls
    return () => clearTimeout(debounceTimer);
  }, [companyName]);

  const toggleFormat = (format: ReportFormat) => {
    setRequestedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const handleValidateCompany = async () => {
    if (!companyName.trim()) return;

    setIsValidating(true);
    setValidationResult(null);
    setError(null);

    try {
      const response = await reportsAPI.enrichCompany(companyName.trim());
      const enrichedData = response.data.data;

      setValidationResult({
        originalName: companyName,
        validatedName: enrichedData.validatedName,
        status: 'validated',
        enrichedData,
        isAccepted: false,
      });
    } catch (err) {
      console.error('Failed to validate company:', err);
      setValidationResult({
        originalName: companyName,
        status: 'error',
        isAccepted: false,
        errorMessage: 'Failed to validate company name',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleAcceptValidation = () => {
    if (validationResult?.validatedName) {
      setCompanyName(validationResult.validatedName);
      setValidationResult({ ...validationResult, isAccepted: true });
    }
  };

  const handleDismissValidation = () => {
    setValidationResult(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsGenerating(true);

    try {
      // Validate inputs
      if (!title.trim()) {
        setError('Please enter a report title');
        setIsGenerating(false);
        return;
      }

      if (!companyName.trim()) {
        setError('Please enter a company name');
        setIsGenerating(false);
        return;
      }

      // Validate Webex delivery if enabled
      if (webexDelivery.enabled) {
        const validation = validateWebexDestination(webexDelivery.destination, webexDelivery.destinationType);
        if (!validation.valid) {
          setError(validation.error || 'Invalid Webex delivery destination');
          setIsGenerating(false);
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

      const input: CreateReportInput = {
        title: title.trim(),
        workflowType: 'ACCOUNT_INTELLIGENCE',
        companyName: companyName.trim(),
        depth,
        requestedFormats: requestedFormats.length > 0 ? requestedFormats : undefined,
        delivery,
        podcastOptions: includePodcast ? podcastOptions : undefined,
      };

      await reportsAPI.create(input);

      // Reset form
      setTitle('');
      setCompanyName('');
      setDepth('standard');
      setRequestedFormats([]);
      setWebexDelivery(DEFAULT_WEBEX_DELIVERY);
      setShowOptions(false);

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

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-meraki-blue/10 rounded-xl">
              <Building2 className="w-6 h-6 text-meraki-blue" />
            </div>
            <h1 className="text-2xl font-semibold text-meraki-gray-900">
              Account Intelligence
            </h1>
          </div>
          <p className="text-sm text-meraki-gray-500">
            Generate comprehensive account intelligence reports for target companies
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-meraki-gray-200 shadow-card">
              <div className="p-6">
                <form onSubmit={handleGenerate} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {/* Company Name */}
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-meraki-gray-700 mb-2">
                      Company Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="company"
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          setValidationResult(null);
                        }}
                        placeholder="e.g., Cisco Systems"
                        className="flex-1 px-4 py-3 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                        disabled={isGenerating}
                      />
                      <button
                        type="button"
                        onClick={handleValidateCompany}
                        disabled={isGenerating || isValidating || !companyName.trim()}
                        className="flex items-center gap-2 px-4 py-3 bg-meraki-blue/10 text-meraki-blue hover:bg-meraki-blue/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isValidating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Validate
                          </>
                        )}
                      </button>
                    </div>

                    {/* Validation Result Card */}
                    {validationResult && validationResult.status === 'validated' && !validationResult.isAccepted && (
                      <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-900 mb-1">
                              Validated Company Name
                            </p>
                            <p className="text-sm text-amber-800">
                              <span className="line-through opacity-60">{validationResult.originalName}</span>
                              {' → '}
                              <span className="font-semibold">{validationResult.validatedName}</span>
                            </p>
                            {validationResult.enrichedData && (
                              <div className="mt-2 space-y-1">
                                {validationResult.enrichedData.industry && (
                                  <p className="text-xs text-amber-700">
                                    <span className="font-medium">Industry:</span> {validationResult.enrichedData.industry}
                                  </p>
                                )}
                                {validationResult.enrichedData.headquarters && (
                                  <p className="text-xs text-amber-700">
                                    <span className="font-medium">HQ:</span> {validationResult.enrichedData.headquarters}
                                  </p>
                                )}
                                {validationResult.enrichedData.confidence && (
                                  <p className="text-xs text-amber-700">
                                    <span className="font-medium">Confidence:</span> {Math.round(validationResult.enrichedData.confidence * 100)}%
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleAcceptValidation}
                              className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                              title="Accept validated name"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleDismissValidation}
                              className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"
                              title="Dismiss"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Card */}
                    {validationResult && validationResult.status === 'error' && (
                      <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-900 mb-1">Validation Failed</p>
                            <p className="text-sm text-red-800">
                              {validationResult.errorMessage || 'Failed to validate company name'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleDismissValidation}
                            className="p-2 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="mt-2 text-xs text-meraki-gray-400">
                      Enter company name and click Validate for AI-powered normalization
                    </p>
                  </div>

                  {/* Report Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-meraki-gray-700 mb-2">
                      Report Title
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Account Intelligence - Acme Corp"
                        className={`w-full px-4 py-3 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent ${isGeneratingTitle ? 'animate-pulse' : ''}`}
                        disabled={isGenerating || isGeneratingTitle}
                      />
                      {isGeneratingTitle && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-5 w-5 text-meraki-blue animate-spin" />
                        </div>
                      )}
                    </div>
                    {isGeneratingTitle && (
                      <p className="mt-1 text-sm text-meraki-gray-500">Generating title...</p>
                    )}
                  </div>

                  {/* Collapsible Options */}
                  <div className="border border-meraki-gray-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShowOptions(!showOptions)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-meraki-gray-50 transition-colors rounded-lg"
                    >
                      <span className="text-sm font-medium text-meraki-gray-700">
                        Show Options
                      </span>
                      {showOptions ? (
                        <ChevronUp className="w-4 h-4 text-meraki-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-meraki-gray-400" />
                      )}
                    </button>

                    {showOptions && (
                      <div className="p-4 pt-0 space-y-6">
                        {/* Depth Selector */}
                        <DepthSelector
                          value={depth}
                          onChange={setDepth}
                          disabled={isGenerating}
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
                                disabled={isGenerating}
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
                                disabled={isGenerating}
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
                            disabled={isGenerating}
                          />
                        </div>

                        {/* Virtual Podcast Option */}
                        <div className="space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includePodcast}
                              onChange={(e) => setIncludePodcast(e.target.checked)}
                              disabled={isGenerating}
                              className="w-4 h-4 text-meraki-blue bg-white border-meraki-gray-300 rounded focus:ring-meraki-blue focus:ring-2 disabled:opacity-50"
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
                    )}
                  </div>

                  {/* Generate Button */}
                  <button
                    type="submit"
                    disabled={isGenerating || !companyName.trim() || !title.trim()}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-meraki-blue text-white font-medium rounded-lg hover:bg-meraki-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Report
                      </>
                    )}
                  </button>
                </form>
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
                  Recent Reports
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
                      <Building2 className="w-8 h-8 text-meraki-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-meraki-gray-500">No reports yet</p>
                      <p className="text-xs text-meraki-gray-400 mt-1">
                        Generate your first account intelligence report
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
                                {report.inputData?.companyName || 'N/A'}
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
            <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
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

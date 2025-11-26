'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Report, WorkflowType, ReportFormat, DocumentExport, reportsAPI } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { Download, FileText, Loader2, AlertCircle, RefreshCw, ChevronUp } from 'lucide-react';
import { PodcastSection } from '@/components/podcast';

interface ReportViewerProps {
  report: Report;
  onClose?: () => void;
}

const sectionLabels: Record<string, string> = {
  account_overview: 'Account Overview',
  financial_health: 'Financial Health',
  security_events: 'Security Events',
  current_events: 'Current Events',
  executive_summary: 'Executive Summary',
  company_overview: 'Company Overview',
  product_offerings: 'Product Offerings',
  competitive_positioning: 'Competitive Positioning',
  strengths_weaknesses: 'Strengths & Weaknesses',
  cisco_analysis: 'Cisco Analysis',
  recommendations: 'Recommendations',
  news_narrative: 'News Digest',
};

const workflowLabels: Record<WorkflowType, string> = {
  ACCOUNT_INTELLIGENCE: 'Account Intelligence',
  COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence',
  NEWS_DIGEST: 'News Digest',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReportViewer({ report, onClose }: ReportViewerProps) {
  const sections = report.generatedContent ? Object.keys(report.generatedContent) : [];
  const [activeSection, setActiveSection] = useState(sections[0] || '');
  const [exports, setExports] = useState<DocumentExport[]>([]);
  const [exportLoading, setExportLoading] = useState<{ [key: string]: boolean }>({});
  const [downloadLoading, setDownloadLoading] = useState<{ [key: string]: boolean }>({});
  const [showScrollTop, setShowScrollTop] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const companyDisplay = report.inputData.companyName
    || (report.inputData.companyNames?.length ? report.inputData.companyNames.join(', ') : 'N/A');

  // Handle scroll to show/hide scroll-to-top button and track active section
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 200);

      // Update active section based on scroll position
      const scrollPosition = container.scrollTop + 100;
      for (const section of sections) {
        const element = sectionRefs.current[section];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            if (activeSection !== section) {
              setActiveSection(section);
            }
            break;
          }
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [sections, activeSection]);

  // Scroll to section when clicking on sidebar
  const scrollToSection = (section: string) => {
    setActiveSection(section);
    const element = sectionRefs.current[section];
    if (element && contentRef.current) {
      contentRef.current.scrollTo({
        top: element.offsetTop - 20,
        behavior: 'smooth',
      });
    }
  };

  // Scroll to top function
  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load export status for completed reports
  const loadExports = useCallback(async () => {
    if (report.status !== 'COMPLETED') return;
    try {
      const response = await reportsAPI.getExports(report.id);
      setExports(response.data.data || []);
    } catch (err) {
      console.error('Failed to load exports:', err);
    }
  }, [report.id, report.status]);

  useEffect(() => {
    loadExports();
  }, [loadExports]);

  // Poll for processing exports
  useEffect(() => {
    const processingExports = exports.filter((e) => e.status === 'PENDING' || e.status === 'PROCESSING');
    if (processingExports.length === 0) return;

    const interval = setInterval(loadExports, 3000);
    return () => clearInterval(interval);
  }, [exports, loadExports]);

  const handleRequestExport = async (format: ReportFormat) => {
    setExportLoading((prev) => ({ ...prev, [format]: true }));
    try {
      await reportsAPI.requestExport(report.id, format);
      await loadExports();
    } catch (err) {
      console.error('Failed to request export:', err);
    } finally {
      setExportLoading((prev) => ({ ...prev, [format]: false }));
    }
  };

  const handleDownload = async (format: ReportFormat) => {
    setDownloadLoading((prev) => ({ ...prev, [format]: true }));
    try {
      const blob = await reportsAPI.downloadExport(report.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download export:', err);
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [format]: false }));
    }
  };

  const getExportForFormat = (format: ReportFormat) => exports.find((e) => e.format === format);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-meraki-gray-200 bg-meraki-gray-50">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-meraki-gray-900">{report.title}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-meraki-gray-500">
              <span>{workflowLabels[report.workflowType]}</span>
              <span className="w-1 h-1 rounded-full bg-meraki-gray-300" />
              <span>{companyDisplay}</span>
              <span className="w-1 h-1 rounded-full bg-meraki-gray-300" />
              <span>{formatDate(report.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Download Buttons */}
            {report.status === 'COMPLETED' && (
              <>
                {(['PDF', 'DOCX'] as ReportFormat[]).map((format) => {
                  const exportJob = getExportForFormat(format);
                  const isLoading = exportLoading[format] || downloadLoading[format];
                  const isProcessing = exportJob?.status === 'PENDING' || exportJob?.status === 'PROCESSING';
                  const isReady = exportJob?.status === 'COMPLETED';
                  const isFailed = exportJob?.status === 'FAILED';

                  return (
                    <button
                      key={format}
                      onClick={() => isReady ? handleDownload(format) : handleRequestExport(format)}
                      disabled={isLoading || isProcessing}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isReady
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : isFailed
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : isProcessing
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-meraki-gray-100 text-meraki-gray-700 hover:bg-meraki-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={
                        isReady ? `Download ${format}` :
                        isProcessing ? `${format} is being generated...` :
                        isFailed ? `Retry ${format} generation` :
                        `Generate ${format}`
                      }
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : isReady ? (
                        <Download className="w-4 h-4" />
                      ) : isFailed ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      {format}
                    </button>
                  );
                })}
              </>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 hover:bg-meraki-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Analytics */}
        {report.analytics && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-meraki-gray-200">
            <div>
              <div className="text-xs text-meraki-gray-400 uppercase tracking-wide">Generation Time</div>
              <div className="text-sm font-medium text-meraki-gray-700">
                {(report.analytics.generationTimeMs / 1000).toFixed(1)}s
              </div>
            </div>
            <div>
              <div className="text-xs text-meraki-gray-400 uppercase tracking-wide">Tokens Used</div>
              <div className="text-sm font-medium text-meraki-gray-700">
                {report.analytics.tokensUsed.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-meraki-gray-400 uppercase tracking-wide">Sections</div>
              <div className="text-sm font-medium text-meraki-gray-700">{report.analytics.sections}</div>
            </div>
            {report.llmModel && (
              <div>
                <div className="text-xs text-meraki-gray-400 uppercase tracking-wide">Model</div>
                <div className="text-sm font-medium text-meraki-gray-700">{report.llmModel}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Section Navigation */}
        {sections.length > 1 && (
          <nav className="w-64 border-r border-meraki-gray-200 bg-meraki-gray-50 flex flex-col">
            <div className="sticky top-0 bg-meraki-gray-50 z-10 px-3 pt-3">
              <div className="text-xs font-medium text-meraki-gray-400 uppercase tracking-wide px-3 py-2">
                Sections ({sections.length})
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto space-y-1 px-3 pb-3">
              {sections.map((section, index) => {
                const sectionContent = report.generatedContent?.[section];
                const tokens = sectionContent?.metadata?.tokens;
                return (
                  <li key={section}>
                    <button
                      onClick={() => scrollToSection(section)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                        activeSection === section
                          ? 'bg-meraki-blue text-white shadow-sm'
                          : 'text-meraki-gray-700 hover:bg-meraki-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{sectionLabels[section] || section}</span>
                        <span className={`text-xs ${activeSection === section ? 'text-white/70' : 'text-meraki-gray-400'}`}>
                          {index + 1}/{sections.length}
                        </span>
                      </div>
                      {tokens && (
                        <div className={`text-xs mt-0.5 ${activeSection === section ? 'text-white/60' : 'text-meraki-gray-400'}`}>
                          {tokens.toLocaleString()} tokens
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {/* Main Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 relative">
          {/* Scroll to Top Button */}
          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 p-3 bg-meraki-blue text-white rounded-full shadow-lg hover:bg-meraki-blue-dark transition-all z-20"
              title="Scroll to top"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          )}

          {report.status === 'PROCESSING' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 border-4 border-meraki-blue/20 border-t-meraki-blue rounded-full animate-spin mb-4" />
              <h3 className="text-lg font-medium text-meraki-gray-900">Generating Report</h3>
              <p className="text-sm text-meraki-gray-500 mt-1">
                This may take a few minutes depending on the report type...
              </p>
            </div>
          )}

          {report.status === 'FAILED' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-meraki-gray-900">Generation Failed</h3>
              <p className="text-sm text-meraki-gray-500 mt-1 max-w-md">
                {(report.generatedContent as any)?.error || 'An error occurred during report generation. Please try again.'}
              </p>
            </div>
          )}

          {report.status === 'PENDING' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-meraki-gray-900">Queued</h3>
              <p className="text-sm text-meraki-gray-500 mt-1">
                This report is waiting to be processed...
              </p>
            </div>
          )}

          {report.status === 'COMPLETED' && sections.length > 0 && (
            <div className="space-y-12">
              {sections.map((section, index) => {
                const sectionContent = report.generatedContent?.[section];
                if (!sectionContent) return null;

                return (
                  <div
                    key={section}
                    ref={(el: HTMLDivElement | null) => { sectionRefs.current[section] = el; }}
                    className="prose prose-sm max-w-none scroll-mt-6"
                  >
                    <h2 className="text-lg font-semibold text-meraki-gray-900 mb-4 flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-meraki-blue/10 text-meraki-blue text-sm font-medium">
                        {index + 1}
                      </span>
                      {sectionLabels[section] || section}
                    </h2>
                    <div className="text-meraki-gray-700 leading-relaxed">
                      <ReactMarkdown>{sectionContent.content}</ReactMarkdown>
                    </div>
                    {sectionContent.metadata && (
                      <div className="mt-6 pt-4 border-t border-meraki-gray-200 text-xs text-meraki-gray-400 flex items-center gap-4 flex-wrap">
                        <span>Generated by {sectionContent.metadata.model}</span>
                        <span className="w-1 h-1 rounded-full bg-meraki-gray-300" />
                        <span>{sectionContent.metadata.tokens.toLocaleString()} tokens</span>
                        <span className="w-1 h-1 rounded-full bg-meraki-gray-300" />
                        <span>{formatDate(sectionContent.metadata.generatedAt)}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Virtual Podcast Section */}
              <div className="mt-8 pt-8 border-t border-meraki-gray-200">
                <PodcastSection reportId={report.id} />
              </div>
            </div>
          )}

          {report.status === 'COMPLETED' && sections.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-meraki-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-meraki-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-meraki-gray-900">No Content</h3>
              <p className="text-sm text-meraki-gray-500 mt-1">
                This report doesn&apos;t have any generated content yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

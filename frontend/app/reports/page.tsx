'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ReportCard, CreateReportForm, ReportViewer } from '@/components/reports';
import { reportsAPI, Report, CreateReportInput, WorkflowType, ReportStatus } from '@/lib/api';
import { Plus, Filter, RefreshCw, Search, ArrowUpDown, Trash2, CheckSquare, Square } from 'lucide-react';

type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'alphabetical_desc';

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkflow, setFilterWorkflow] = useState<WorkflowType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ReportStatus | ''>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { workflowType?: WorkflowType; status?: ReportStatus } = {};
      if (filterWorkflow) params.workflowType = filterWorkflow;
      if (filterStatus) params.status = filterStatus;

      const response = await reportsAPI.list(params);
      setReports(response.data.data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filterWorkflow, filterStatus]);

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

  const handleCreateReport = async (data: CreateReportInput) => {
    setIsCreating(true);
    try {
      await reportsAPI.create(data);
      setShowCreateForm(false);
      loadReports();
    } catch (err) {
      console.error('Failed to create report:', err);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const handleRetryReport = async (report: Report) => {
    try {
      await reportsAPI.retry(report.id);
      loadReports();
    } catch (err) {
      console.error('Failed to retry report:', err);
      setError('Failed to retry report. Please try again.');
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
      setError('Failed to delete report. Please try again.');
    }
  };

  const handleViewReport = async (report: Report) => {
    try {
      const response = await reportsAPI.get(report.id);
      setSelectedReport(response.data.data);
    } catch (err) {
      console.error('Failed to load report details:', err);
      setError('Failed to load report details. Please try again.');
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedReportIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedReportIds.size} report(s)?`)) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedReportIds).map((id) => reportsAPI.delete(id))
      );
      if (selectedReport && selectedReportIds.has(selectedReport.id)) {
        setSelectedReport(null);
      }
      setSelectedReportIds(new Set());
      loadReports();
    } catch (err) {
      console.error('Failed to delete reports:', err);
      setError('Failed to delete some reports. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Toggle report selection
  const toggleReportSelection = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReportIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  // Select/deselect all visible reports
  const toggleSelectAll = () => {
    if (selectedReportIds.size === filteredReports.length) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(filteredReports.map((r) => r.id)));
    }
  };

  // Filter and sort reports
  const filteredReports = reports
    .filter((report) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        report.title.toLowerCase().includes(search) ||
        report.inputData.companyName?.toLowerCase().includes(search) ||
        report.inputData.companyNames?.some((n) => n.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'alphabetical_desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-meraki-gray-900">Reports</h1>
            <p className="text-sm text-meraki-gray-500 mt-1">
              Generate and manage intelligence reports
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-meraki-blue text-white rounded-lg font-medium hover:bg-meraki-blue-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Report
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-meraki-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
            />
          </div>
          <select
            value={filterWorkflow}
            onChange={(e) => setFilterWorkflow(e.target.value as WorkflowType | '')}
            className="px-4 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-700 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="ACCOUNT_INTELLIGENCE">Account Intelligence</option>
            <option value="COMPETITIVE_INTELLIGENCE">Competitive Intelligence</option>
            <option value="NEWS_DIGEST">News Digest</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ReportStatus | '')}
            className="px-4 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-700 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-700 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alphabetical">A-Z</option>
            <option value="alphabetical_desc">Z-A</option>
          </select>
          <button
            onClick={loadReports}
            disabled={isLoading}
            className="p-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-600 hover:bg-meraki-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Bulk Actions Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-meraki-gray-600 hover:text-meraki-gray-900 transition-colors"
            >
              {selectedReportIds.size === filteredReports.length && filteredReports.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-meraki-blue" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedReportIds.size > 0 ? `${selectedReportIds.size} selected` : 'Select all'}
            </button>
            {selectedReportIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            )}
          </div>
          <div className="text-sm text-meraki-gray-500">
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
            {reports.length !== filteredReports.length && ` (${reports.length} total)`}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Reports List */}
          <div className={`${selectedReport ? 'w-96' : 'flex-1'} flex flex-col min-h-0`}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-meraki-blue/20 border-t-meraki-blue rounded-full animate-spin" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-white border border-meraki-gray-200 rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-meraki-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-8 h-8 text-meraki-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-meraki-gray-900">No reports found</h3>
                <p className="text-sm text-meraki-gray-500 mt-1">
                  {searchTerm || filterWorkflow || filterStatus
                    ? 'Try adjusting your filters'
                    : 'Create your first report to get started'}
                </p>
                {!searchTerm && !filterWorkflow && !filterStatus && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-4 px-4 py-2 bg-meraki-blue text-white rounded-lg font-medium hover:bg-meraki-blue-dark transition-colors"
                  >
                    Create Report
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 overflow-y-auto pr-2">
                {filteredReports.map((report) => (
                  <div key={report.id} className="relative group">
                    {/* Selection checkbox */}
                    <div
                      className={`absolute -left-1 top-1/2 -translate-y-1/2 z-10 transition-opacity ${
                        selectedReportIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <button
                        onClick={(e) => toggleReportSelection(report.id, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          selectedReportIds.has(report.id)
                            ? 'bg-meraki-blue text-white'
                            : 'bg-white border border-meraki-gray-300 text-meraki-gray-400 hover:text-meraki-gray-600 hover:border-meraki-gray-400'
                        }`}
                      >
                        {selectedReportIds.has(report.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {/* Report card with left margin when selection is active */}
                    <div className={`transition-all ${selectedReportIds.size > 0 ? 'ml-8' : ''}`}>
                      <ReportCard
                        report={report}
                        onClick={handleViewReport}
                        onRetry={handleRetryReport}
                        onDelete={handleDeleteReport}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report Viewer */}
          {selectedReport && (
            <div className="flex-1 min-w-0 border border-meraki-gray-200 rounded-xl overflow-hidden">
              <ReportViewer
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
              />
            </div>
          )}
        </div>

        {/* Create Report Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-meraki-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-meraki-gray-900">Create New Report</h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 hover:bg-meraki-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <CreateReportForm onSubmit={handleCreateReport} isLoading={isCreating} />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TemplateCard from '@/components/templates/TemplateCard';
import TemplateForm from '@/components/templates/TemplateForm';
import {
  templatesAPI,
  reportsAPI,
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  WorkflowType,
} from '@/lib/api';
import { Plus, Filter, RefreshCw, Search, LayoutTemplate } from 'lucide-react';

type SortOption = 'newest' | 'oldest' | 'alphabetical';

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkflow, setFilterWorkflow] = useState<WorkflowType | ''>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Apply template form state
  const [applyTitle, setApplyTitle] = useState('');
  const [applyCompanyName, setApplyCompanyName] = useState('');
  const [applyCompanyNames, setApplyCompanyNames] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { workflowType?: WorkflowType } = {};
      if (filterWorkflow) params.workflowType = filterWorkflow;

      const response = await templatesAPI.list(params);
      setTemplates(response.data.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filterWorkflow]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateTemplate = async (data: CreateTemplateInput | UpdateTemplateInput) => {
    setIsSubmitting(true);
    try {
      await templatesAPI.create(data as CreateTemplateInput);
      setShowForm(false);
      loadTemplates();
    } catch (err) {
      console.error('Failed to create template:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTemplate = async (data: CreateTemplateInput | UpdateTemplateInput) => {
    if (!editingTemplate) return;
    setIsSubmitting(true);
    try {
      await templatesAPI.update(editingTemplate.id, data as UpdateTemplateInput);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error('Failed to update template:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;
    try {
      await templatesAPI.delete(template.id);
      loadTemplates();
    } catch (err: any) {
      console.error('Failed to delete template:', err);
      const message = err.response?.data?.error?.message || 'Failed to delete template. Please try again.';
      setError(message);
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      await templatesAPI.duplicate(template.id);
      loadTemplates();
    } catch (err) {
      console.error('Failed to duplicate template:', err);
      setError('Failed to duplicate template. Please try again.');
    }
  };

  const handleApplyTemplate = async () => {
    if (!applyingTemplate) return;
    setApplyError(null);

    // Validation
    if (!applyTitle.trim()) {
      setApplyError('Please enter a report title');
      return;
    }

    const isNewsDigest = applyingTemplate.workflowType === 'NEWS_DIGEST';
    if (isNewsDigest) {
      const names = applyCompanyNames.split(',').map((n) => n.trim()).filter(Boolean);
      if (names.length === 0) {
        setApplyError('Please enter at least one company name');
        return;
      }
    } else {
      if (!applyCompanyName.trim()) {
        setApplyError('Please enter a company name');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await templatesAPI.apply(applyingTemplate.id, {
        title: applyTitle.trim(),
        companyName: isNewsDigest ? undefined : applyCompanyName.trim(),
        companyNames: isNewsDigest
          ? applyCompanyNames.split(',').map((n) => n.trim()).filter(Boolean)
          : undefined,
      });

      // Navigate to reports page to view the new report
      router.push('/reports');
    } catch (err: any) {
      console.error('Failed to apply template:', err);
      const message = err.response?.data?.error?.message || 'Failed to create report from template.';
      setApplyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openApplyDialog = (template: Template) => {
    setApplyingTemplate(template);
    setApplyTitle('');
    setApplyCompanyName('');
    setApplyCompanyNames('');
    setApplyError(null);
  };

  // Filter and sort templates
  const filteredTemplates = templates
    .filter((template) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        template.name.toLowerCase().includes(search) ||
        template.description?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'alphabetical':
          return a.name.localeCompare(b.name);
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
            <h1 className="text-2xl font-semibold text-meraki-gray-900">Templates</h1>
            <p className="text-sm text-meraki-gray-500 mt-1">
              Save and reuse report configurations
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-meraki-blue text-white rounded-lg font-medium hover:bg-meraki-blue-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Template
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-meraki-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
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
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-700 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          >
            <option value="newest">Recently Updated</option>
            <option value="oldest">Oldest First</option>
            <option value="alphabetical">A-Z</option>
          </select>
          <button
            onClick={loadTemplates}
            disabled={isLoading}
            className="p-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-600 hover:bg-meraki-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
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
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-meraki-blue/20 border-t-meraki-blue rounded-full animate-spin" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-white border border-meraki-gray-200 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-meraki-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LayoutTemplate className="w-8 h-8 text-meraki-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-meraki-gray-900">No templates found</h3>
              <p className="text-sm text-meraki-gray-500 mt-1">
                {searchTerm || filterWorkflow
                  ? 'Try adjusting your filters'
                  : 'Create your first template to save report configurations'}
              </p>
              {!searchTerm && !filterWorkflow && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 px-4 py-2 bg-meraki-blue text-white rounded-lg font-medium hover:bg-meraki-blue-dark transition-colors"
                >
                  Create Template
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={(t) => setEditingTemplate(t)}
                  onDuplicate={handleDuplicateTemplate}
                  onDelete={handleDeleteTemplate}
                  onApply={openApplyDialog}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create Template Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-meraki-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-meraki-gray-900">Create New Template</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 hover:bg-meraki-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <TemplateForm
                  onSubmit={handleCreateTemplate}
                  onCancel={() => setShowForm(false)}
                  isLoading={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        {/* Edit Template Modal */}
        {editingTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-meraki-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-meraki-gray-900">Edit Template</h2>
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 hover:bg-meraki-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <TemplateForm
                  template={editingTemplate}
                  onSubmit={handleUpdateTemplate}
                  onCancel={() => setEditingTemplate(null)}
                  isLoading={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        {/* Apply Template Modal */}
        {applyingTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-meraki-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-meraki-gray-900">Use Template</h2>
                  <button
                    onClick={() => setApplyingTemplate(null)}
                    className="p-2 text-meraki-gray-400 hover:text-meraki-gray-600 hover:bg-meraki-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-meraki-gray-500 mt-1">
                  Creating report from &quot;{applyingTemplate.name}&quot;
                </p>
              </div>
              <div className="p-6 space-y-4">
                {applyError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {applyError}
                  </div>
                )}

                <div>
                  <label htmlFor="applyTitle" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                    Report Title
                  </label>
                  <input
                    type="text"
                    id="applyTitle"
                    value={applyTitle}
                    onChange={(e) => setApplyTitle(e.target.value)}
                    placeholder="e.g., Q4 Analysis - Acme Corp"
                    className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>

                {applyingTemplate.workflowType === 'NEWS_DIGEST' ? (
                  <div>
                    <label htmlFor="applyCompanyNames" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                      Company Names (comma-separated)
                    </label>
                    <textarea
                      id="applyCompanyNames"
                      value={applyCompanyNames}
                      onChange={(e) => setApplyCompanyNames(e.target.value)}
                      placeholder="e.g., Microsoft, Google, Amazon"
                      rows={3}
                      className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent resize-none"
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="applyCompanyName" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="applyCompanyName"
                      value={applyCompanyName}
                      onChange={(e) => setApplyCompanyName(e.target.value)}
                      placeholder="e.g., Acme Corporation"
                      className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setApplyingTemplate(null)}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-4 bg-meraki-gray-100 text-meraki-gray-700 font-medium rounded-lg hover:bg-meraki-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyTemplate}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-4 bg-meraki-blue text-white font-medium rounded-lg hover:bg-meraki-blue-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Report'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

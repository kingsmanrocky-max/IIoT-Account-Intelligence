'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  promptAPI,
  PromptConfig,
  PromptCategory,
  PromptConfigWithVersions,
  PromptVersion,
  UpdatePromptData,
} from '@/lib/api';
import {
  MessageSquare,
  Edit,
  History,
  RotateCcw,
  RefreshCw,
  Save,
  X,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const CATEGORY_LABELS: Record<PromptCategory, string> = {
  REPORT_SYSTEM: 'Report System Prompts',
  REPORT_SECTION: 'Report Section Prompts',
  PODCAST_SYSTEM: 'Podcast Templates',
  PODCAST_HOST: 'Podcast Host Personalities',
};

export default function AdminPromptsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit modal state
  const [editingPrompt, setEditingPrompt] = useState<PromptConfigWithVersions | null>(null);
  const [editFormData, setEditFormData] = useState<UpdatePromptData>({});
  const [isSaving, setIsSaving] = useState(false);

  // Version history state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load prompts
  useEffect(() => {
    loadPrompts();
  }, [selectedCategory]);

  const loadPrompts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const category = selectedCategory === 'ALL' ? undefined : selectedCategory;
      const response = await promptAPI.list(category);
      setPrompts(response.data.data);
    } catch (err) {
      console.error('Failed to load prompts:', err);
      setError('Failed to load prompts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (promptId: string) => {
    try {
      const response = await promptAPI.getById(promptId);
      setEditingPrompt(response.data.data);
      setEditFormData({
        promptText: response.data.data.promptText,
        parameters: response.data.data.parameters || {},
      });
    } catch (err) {
      console.error('Failed to load prompt details:', err);
      setError('Failed to load prompt details.');
    }
  };

  const handleSave = async () => {
    if (!editingPrompt) return;

    setIsSaving(true);
    setError(null);
    try {
      await promptAPI.update(editingPrompt.id, editFormData);
      setSuccessMessage('Prompt updated successfully!');
      setEditingPrompt(null);
      loadPrompts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update prompt:', err);
      setError('Failed to update prompt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async (promptId: string, version: number) => {
    if (!confirm(`Revert to version ${version}? This will create a new version with the reverted content.`)) {
      return;
    }

    try {
      await promptAPI.revertToVersion(promptId, version);
      setSuccessMessage(`Reverted to version ${version}!`);
      loadPrompts();
      if (editingPrompt) {
        const response = await promptAPI.getById(promptId);
        setEditingPrompt(response.data.data);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to revert prompt:', err);
      setError('Failed to revert prompt. Please try again.');
    }
  };

  const handleReset = async (promptId: string) => {
    if (!confirm('Reset this prompt to its default version? This cannot be undone.')) {
      return;
    }

    try {
      await promptAPI.resetToDefault(promptId);
      setSuccessMessage('Prompt reset to default!');
      loadPrompts();
      if (editingPrompt) {
        setEditingPrompt(null);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to reset prompt:', err);
      setError('Failed to reset prompt. Please try again.');
    }
  };

  const togglePromptExpansion = (promptId: string) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(promptId)) {
      newExpanded.delete(promptId);
    } else {
      newExpanded.add(promptId);
    }
    setExpandedPrompts(newExpanded);
  };

  const filteredPrompts = prompts;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              Prompt Management
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage AI prompts for reports and podcasts
            </p>
          </div>
          <button
            onClick={loadPrompts}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-200">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        )}

        {/* Category Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as PromptCategory | 'ALL')}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Categories</option>
            <option value="REPORT_SYSTEM">Report System Prompts</option>
            <option value="REPORT_SECTION">Report Section Prompts</option>
            <option value="PODCAST_SYSTEM">Podcast Templates</option>
            <option value="PODCAST_HOST">Podcast Host Personalities</option>
          </select>
        </div>

        {/* Prompts List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => togglePromptExpansion(prompt.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {expandedPrompts.has(prompt.id) ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </button>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {prompt.name}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {CATEGORY_LABELS[prompt.category]}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          v{prompt.currentVersion}
                        </span>
                      </div>
                      {prompt.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 ml-7 mb-2">
                          {prompt.description}
                        </p>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-500 ml-7">
                        Key: <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{prompt.key}</code>
                      </div>

                      {/* Expanded Details */}
                      {expandedPrompts.has(prompt.id) && (
                        <div className="mt-4 ml-7 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Prompt Text Preview
                            </label>
                            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 max-h-32 overflow-y-auto">
                              {prompt.promptText.substring(0, 300)}
                              {prompt.promptText.length > 300 && '...'}
                            </div>
                          </div>
                          {prompt.parameters && Object.keys(prompt.parameters).length > 0 && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Parameters
                              </label>
                              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200">
                                {JSON.stringify(prompt.parameters, null, 2)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(prompt.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      {prompt.isDefault && (
                        <button
                          onClick={() => handleReset(prompt.id)}
                          className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          title="Reset to Default"
                        >
                          <RotateCcw className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Modal */}
        {editingPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Edit Prompt: {editingPrompt.name}
                  </h2>
                  <button
                    onClick={() => setEditingPrompt(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Prompt Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prompt Text
                  </label>
                  <textarea
                    value={editFormData.promptText || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, promptText: e.target.value })
                    }
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Parameters */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Parameters (JSON)
                  </label>
                  <textarea
                    value={JSON.stringify(editFormData.parameters || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const params = JSON.parse(e.target.value);
                        setEditFormData({ ...editFormData, parameters: params });
                      } catch (err) {
                        // Invalid JSON, allow editing
                      }
                    }}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Change Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Change Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={editFormData.changeReason || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, changeReason: e.target.value })
                    }
                    placeholder="Describe what you changed and why"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Version History */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Version History
                    </label>
                    <button
                      onClick={() => setShowVersionHistory(!showVersionHistory)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <History className="h-4 w-4" />
                      {showVersionHistory ? 'Hide' : 'Show'} History
                    </button>
                  </div>

                  {showVersionHistory && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
                      {editingPrompt.versions.map((version) => (
                        <div key={version.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  Version {version.version}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(version.createdAt).toLocaleString()}
                                </span>
                              </div>
                              {version.changeReason && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {version.changeReason}
                                </p>
                              )}
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                {version.promptText.substring(0, 150)}
                                {version.promptText.length > 150 && '...'}
                              </div>
                            </div>
                            {version.version !== editingPrompt.currentVersion && (
                              <button
                                onClick={() => handleRevert(editingPrompt.id, version.version)}
                                className="ml-2 p-1 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded"
                                title="Revert to this version"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setEditingPrompt(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

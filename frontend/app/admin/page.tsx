'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  adminAPI,
  SystemSettings,
  LLMProvider,
  UpdateSettingsInput,
  ConnectionTestResult,
} from '@/lib/api';
import {
  Settings,
  Key,
  Bot,
  Cpu,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Save,
  TestTube,
  Loader2,
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<UpdateSettingsInput>({});
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load settings and providers
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settingsRes, providersRes] = await Promise.all([
        adminAPI.getSettings(),
        adminAPI.getProviders(),
      ]);
      setSettings(settingsRes.data.data);
      setProviders(providersRes.data.data);
      setFormData({
        llmPrimaryProvider: settingsRes.data.data.llmPrimaryProvider,
        llmDefaultModel: settingsRes.data.data.llmDefaultModel,
        reportRetentionDays: settingsRes.data.data.reportRetentionDays,
      });
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await adminAPI.updateSettings(formData);
      setSettings(response.data.data);
      setSuccessMessage('Settings saved successfully!');
      // Clear API key inputs after save
      setFormData((prev) => ({
        ...prev,
        openaiApiKey: undefined,
        xaiApiKey: undefined,
        webexBotToken: undefined,
        webexWebhookSecret: undefined,
      }));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLLM = async (provider: string) => {
    setTestingProvider(provider);
    setTestResults((prev) => ({ ...prev, [provider]: { success: false, message: 'Testing...' } }));
    try {
      const response = await adminAPI.testLLMConnection(provider);
      setTestResults((prev) => ({ ...prev, [provider]: response.data.data }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          message: err.response?.data?.error?.message || 'Connection test failed',
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleTestWebex = async () => {
    setTestingProvider('webex');
    setTestResults((prev) => ({ ...prev, webex: { success: false, message: 'Testing...' } }));
    try {
      const response = await adminAPI.testWebexConnection();
      setTestResults((prev) => ({ ...prev, webex: response.data.data }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        webex: {
          success: false,
          message: err.response?.data?.error?.message || 'Connection test failed',
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  // Get models for selected provider
  const selectedProvider = providers.find((p) => p.id === formData.llmPrimaryProvider);
  const availableModels = selectedProvider?.models || [];

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-meraki-gray-900 flex items-center gap-3">
            <Settings className="w-7 h-7 text-meraki-blue" />
            System Administration
          </h1>
          <p className="text-sm text-meraki-gray-500 mt-1">
            Configure LLM providers, API keys, and system settings
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-meraki-blue animate-spin" />
          </div>
        ) : (
          <>
            {/* LLM Configuration */}
            <div className="bg-white rounded-xl border border-meraki-gray-200 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-meraki-gray-200 bg-meraki-gray-50">
                <h2 className="text-lg font-semibold text-meraki-gray-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-meraki-blue" />
                  LLM Configuration
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Provider Selection */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-meraki-gray-700 mb-2">
                      Primary Provider
                    </label>
                    <select
                      value={formData.llmPrimaryProvider || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          llmPrimaryProvider: e.target.value,
                          llmDefaultModel: '', // Reset model when provider changes
                        }))
                      }
                      className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                    >
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-meraki-gray-700 mb-2">
                      Default Model
                    </label>
                    <select
                      value={formData.llmDefaultModel || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, llmDefaultModel: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                    >
                      <option value="">Select a model</option>
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Current Settings Display */}
                {settings && (
                  <div className="p-4 bg-meraki-gray-50 rounded-lg">
                    <p className="text-sm text-meraki-gray-600">
                      <strong>Current Configuration:</strong> {settings.llmPrimaryProvider} / {settings.llmDefaultModel}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* API Keys */}
            <div className="bg-white rounded-xl border border-meraki-gray-200 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-meraki-gray-200 bg-meraki-gray-50">
                <h2 className="text-lg font-semibold text-meraki-gray-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-meraki-blue" />
                  API Keys
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* OpenAI API Key */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-meraki-gray-700">
                      OpenAI API Key
                    </label>
                    <button
                      onClick={() => handleTestLLM('openai')}
                      disabled={testingProvider === 'openai'}
                      className="text-sm text-meraki-blue hover:text-meraki-blue-dark flex items-center gap-1 disabled:opacity-50"
                    >
                      {testingProvider === 'openai' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      Test Connection
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={formData.openaiApiKey || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, openaiApiKey: e.target.value }))
                      }
                      placeholder={settings?.openaiApiKeyMasked || 'sk-...'}
                      className="flex-1 px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                    />
                  </div>
                  {testResults.openai && (
                    <div
                      className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${
                        testResults.openai.success
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {testResults.openai.success ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      {testResults.openai.message}
                      {testResults.openai.latency && ` (${testResults.openai.latency}ms)`}
                    </div>
                  )}
                </div>

                {/* X.ai API Key */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-meraki-gray-700">
                      X.ai (Grok) API Key
                    </label>
                    <button
                      onClick={() => handleTestLLM('xai')}
                      disabled={testingProvider === 'xai'}
                      className="text-sm text-meraki-blue hover:text-meraki-blue-dark flex items-center gap-1 disabled:opacity-50"
                    >
                      {testingProvider === 'xai' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      Test Connection
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={formData.xaiApiKey || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, xaiApiKey: e.target.value }))
                      }
                      placeholder={settings?.xaiApiKeyMasked || 'xai-...'}
                      className="flex-1 px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                    />
                  </div>
                  {testResults.xai && (
                    <div
                      className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${
                        testResults.xai.success
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {testResults.xai.success ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      {testResults.xai.message}
                      {testResults.xai.latency && ` (${testResults.xai.latency}ms)`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Webex Integration */}
            <div className="bg-white rounded-xl border border-meraki-gray-200 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-meraki-gray-200 bg-meraki-gray-50">
                <h2 className="text-lg font-semibold text-meraki-gray-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-meraki-blue" />
                  Webex Integration
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-meraki-gray-700">
                      Webex Bot Token
                    </label>
                    <button
                      onClick={handleTestWebex}
                      disabled={testingProvider === 'webex'}
                      className="text-sm text-meraki-blue hover:text-meraki-blue-dark flex items-center gap-1 disabled:opacity-50"
                    >
                      {testingProvider === 'webex' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      Test Connection
                    </button>
                  </div>
                  <input
                    type="password"
                    value={formData.webexBotToken || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, webexBotToken: e.target.value }))
                    }
                    placeholder={settings?.webexBotTokenMasked || 'Enter Webex bot token'}
                    className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                  />
                  {testResults.webex && (
                    <div
                      className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${
                        testResults.webex.success
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {testResults.webex.success ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      {testResults.webex.message}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-meraki-gray-700 mb-2">
                    Webex Webhook Secret
                  </label>
                  <input
                    type="password"
                    value={formData.webexWebhookSecret || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, webexWebhookSecret: e.target.value }))
                    }
                    placeholder={settings?.webexWebhookSecretMasked || 'Enter webhook secret for signature validation'}
                    className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                  />
                  <p className="mt-1.5 text-xs text-meraki-gray-500">
                    Used to validate webhook signatures from Webex
                  </p>
                </div>
              </div>
            </div>

            {/* System Settings */}
            <div className="bg-white rounded-xl border border-meraki-gray-200 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-meraki-gray-200 bg-meraki-gray-50">
                <h2 className="text-lg font-semibold text-meraki-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-meraki-blue" />
                  System Settings
                </h2>
              </div>
              <div className="p-6">
                <div>
                  <label className="block text-sm font-medium text-meraki-gray-700 mb-2">
                    Report Retention (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.reportRetentionDays || 90}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        reportRetentionDays: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-32 px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
                  />
                  <p className="mt-1.5 text-xs text-meraki-gray-500">
                    Reports older than this will be automatically deleted
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="px-6 py-2.5 border border-meraki-gray-300 text-meraki-gray-700 rounded-lg font-medium hover:bg-meraki-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-meraki-blue text-white rounded-lg font-medium hover:bg-meraki-blue-dark transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Save Settings
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

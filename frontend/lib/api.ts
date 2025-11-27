import axios from 'axios';

// Dynamically construct API URL based on environment
function getApiUrl(): string {
  // If explicitly set in env, use that
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // For browser environment, construct URL from current location
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // Backend runs on port 4001, frontend on 4000
    return `${protocol}//${hostname}:4001/api`;
  }

  // Fallback for server-side rendering
  return 'http://localhost:4001/api';
}

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Types
export type WorkflowType = 'ACCOUNT_INTELLIGENCE' | 'COMPETITIVE_INTELLIGENCE' | 'NEWS_DIGEST';
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ReportFormat = 'PDF' | 'DOCX';
export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
export type DepthPreference = 'brief' | 'standard' | 'detailed';
export type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED';
export type WebexDestinationType = 'email' | 'roomId';
export type WebexContentType = 'ATTACHMENT' | 'SUMMARY_LINK';

// Podcast Types
export type PodcastStatus = 'PENDING' | 'GENERATING_SCRIPT' | 'GENERATING_AUDIO' | 'MIXING' | 'COMPLETED' | 'FAILED';
export type PodcastTemplate = 'EXECUTIVE_BRIEF' | 'STRATEGIC_DEBATE' | 'INDUSTRY_PULSE';
export type PodcastDuration = 'SHORT' | 'STANDARD' | 'LONG';

// Prompt Management Types
export type PromptCategory = 'REPORT_SYSTEM' | 'REPORT_SECTION' | 'PODCAST_SYSTEM' | 'PODCAST_HOST';

export interface PromptConfig {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: PromptCategory;
  promptText: string;
  parameters?: Record<string, unknown>;
  supportedVariables: string[];
  currentVersion: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface PromptVersion {
  id: string;
  promptConfigId: string;
  version: number;
  promptText: string;
  parameters?: Record<string, unknown>;
  changeReason?: string;
  changedBy?: string;
  createdAt: string;
}

export interface PromptConfigWithVersions extends PromptConfig {
  versions: PromptVersion[];
}

export interface UpdatePromptData {
  promptText?: string;
  parameters?: Record<string, unknown>;
  changeReason?: string;
}

export interface PodcastHost {
  id: string;
  name: string;
  role: string;
  voice: string;
}

export interface PodcastTemplateInfo {
  id: PodcastTemplate;
  name: string;
  description: string;
  hosts: { name: string; role: string; voice: string }[];
  durations: PodcastDuration[];
  bestFor: string[];
}

export interface PodcastDurationInfo {
  minutes: number;
  description: string;
  wordCount: number;
}

export interface PodcastGeneration {
  id: string;
  reportId: string;
  template: PodcastTemplate;
  duration: PodcastDuration;
  status: PodcastStatus;
  durationSeconds?: number;
  fileSizeBytes?: number;
  estimatedCost?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

export interface PodcastStatusResponse {
  status: PodcastStatus;
  progress?: number;
  message?: string;
  currentStage?: string;
}

export interface PodcastOptions {
  template: PodcastTemplate;
  duration: PodcastDuration;
  deliveryEnabled?: boolean;
  deliveryDestination?: string;
  deliveryDestinationType?: WebexDestinationType;
}

export interface SectionInfo {
  key: string;
  name: string;
  description: string;
}

// Competitive Intelligence specific types
export interface CompetitiveIntelligenceOptions {
  selectedProducts: string[];  // Cisco IIoT product IDs
  focusIndustry?: string;      // Industry vertical ID
}

// News Digest specific types
export interface NewsDigestOptions {
  newsFocus?: string[];      // Multi-select topic IDs (technology, financials, etc.)
  timePeriod?: string;       // Single-select: last-week, last-month, last-quarter
  industryFilter?: string;   // Single-select industry ID (reuse from CI)
  outputStyle?: string;      // Single-select: executive-brief, narrative, podcast-ready
}

// Webex Delivery types
export interface WebexDeliveryInput {
  method: 'WEBEX';
  destination: string;
  destinationType: WebexDestinationType;
  contentType: WebexContentType;
  format?: ReportFormat;
}

export interface ReportDelivery {
  id: string;
  reportId: string;
  method: 'WEBEX';
  destination: string;
  destinationType: WebexDestinationType;
  contentType: WebexContentType;
  format?: ReportFormat;
  status: DeliveryStatus;
  error?: string;
  messageId?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  deliveredAt?: string;
}

export interface Report {
  id: string;
  userId: string;
  title: string;
  workflowType: WorkflowType;
  status: ReportStatus;
  inputData: {
    companyName?: string;
    companyNames?: string[];
    additionalContext?: Record<string, unknown>;
  };
  generatedContent?: Record<string, {
    section: string;
    content: string;
    metadata: {
      model: string;
      provider: string;
      tokens: number;
      generatedAt: string;
    };
  }>;
  llmModel?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  analytics?: {
    generationTimeMs: number;
    tokensUsed: number;
    sections: number;
  };
  deliveries?: ReportDelivery[];
}

export interface CreateReportInput {
  title: string;
  workflowType: WorkflowType;
  companyName?: string;
  companyNames?: string[];
  additionalContext?: Record<string, unknown>;
  llmModel?: string;
  requestedFormats?: ReportFormat[];
  sections?: string[];
  depth?: DepthPreference;
  competitiveOptions?: CompetitiveIntelligenceOptions;
  newsDigestOptions?: NewsDigestOptions;
  delivery?: WebexDeliveryInput;
  podcastOptions?: PodcastOptions;
}

export interface DocumentExport {
  id: string;
  reportId: string;
  format: ReportFormat;
  status: ExportStatus;
  retryCount: number;
  maxRetries: number;
  filePath?: string;
  fileSize?: number;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  triggeredBy: 'ON_DEMAND' | 'EAGER' | 'SCHEDULED';
}

export interface ListReportsParams {
  workflowType?: WorkflowType;
  status?: ReportStatus;
  limit?: number;
  offset?: number;
}

export interface EnrichCompanyResponse {
  validatedName: string;
  confidence: number;
  industry?: string;
  headquarters?: string;
  website?: string;
  description?: string;
  stockSymbol?: string;
  employeeCount?: string;
  founded?: string;
}

export interface NormalizedCompany {
  originalName: string;
  validatedName: string;
  confidence: string;
  isValid: boolean;
}

export interface ParseCSVResponse {
  originalCount: number;
  normalizedCompanies: NormalizedCompany[];
}

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  logout: () =>
    api.post('/auth/logout'),

  getCurrentUser: () =>
    api.get('/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

// Reports API
export const reportsAPI = {
  // Create a new report
  create: (data: CreateReportInput) =>
    api.post<{ success: boolean; data: Report; message: string }>('/reports', data),

  // List reports
  list: (params?: ListReportsParams) =>
    api.get<{
      success: boolean;
      data: Report[];
      pagination: { total: number; limit: number; offset: number };
    }>('/reports', { params }),

  // Get a specific report
  get: (id: string) =>
    api.get<{ success: boolean; data: Report }>(`/reports/${id}`),

  // Get report status
  getStatus: (id: string) =>
    api.get<{ success: boolean; data: { status: ReportStatus; progress?: number } }>(`/reports/${id}/status`),

  // Retry a failed report
  retry: (id: string) =>
    api.post<{ success: boolean; data: Report; message: string }>(`/reports/${id}/retry`),

  // Delete a report
  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/reports/${id}`),

  // Enrich company data
  enrichCompany: (companyName: string, additionalInfo?: string) =>
    api.post<{ success: boolean; data: EnrichCompanyResponse }>('/reports/enrich-company', {
      companyName,
      additionalInfo,
    }),

  // Generate report title
  generateTitle: async (workflowType: WorkflowType, companyName: string, additionalCompanies?: string[]): Promise<string> => {
    const response = await api.post<{ success: boolean; data: { title: string } }>('/reports/generate-title', {
      workflowType,
      companyName,
      additionalCompanies,
    });
    return response.data.data.title;
  },

  // Parse CSV and normalize company names
  parseCSVCompanies: async (file: File): Promise<ParseCSVResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ success: boolean; data: ParseCSVResponse }>(
      '/reports/parse-csv-companies',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.data;
  },

  // Get workflow sections
  getWorkflowSections: (workflowType: WorkflowType) =>
    api.get<{ success: boolean; data: SectionInfo[] }>(`/reports/workflows/${workflowType}/sections`),

  // LLM configuration (admin only)
  getLLMConfig: () =>
    api.get<{
      success: boolean;
      data: {
        primaryProvider: string;
        fallbackProvider?: string;
        providers: string[];
        defaultTemperature: number;
        defaultMaxTokens: number;
      };
    }>('/reports/llm/config'),

  // Test LLM connection (admin only)
  testLLMConnection: () =>
    api.get<{
      success: boolean;
      data: Array<{ provider: string; connected: boolean }>;
    }>('/reports/llm/test'),

  // Export endpoints
  // Request export generation
  requestExport: (reportId: string, format: ReportFormat) =>
    api.post<{ success: boolean; data: DocumentExport; message: string }>(
      `/reports/${reportId}/export`,
      { format }
    ),

  // Get all exports for a report
  getExports: (reportId: string) =>
    api.get<{ success: boolean; data: DocumentExport[] }>(`/reports/${reportId}/exports`),

  // Check export status for a format
  getExportStatus: (reportId: string, format: ReportFormat) =>
    api.get<{ success: boolean; data: { reportId: string; format: ReportFormat; ready: boolean } }>(
      `/reports/${reportId}/export/${format.toLowerCase()}/status`
    ),

  // Download export file
  downloadExport: async (reportId: string, format: ReportFormat): Promise<Blob> => {
    const response = await api.get(`/reports/${reportId}/download/${format.toLowerCase()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Delivery endpoints
  // Schedule Webex delivery for a report
  scheduleDelivery: (
    reportId: string,
    data: {
      destination: string;
      destinationType: WebexDestinationType;
      contentType: WebexContentType;
      format?: ReportFormat;
    }
  ) =>
    api.post<{ success: boolean; data: ReportDelivery; message: string }>(
      `/reports/${reportId}/deliver`,
      data
    ),

  // Get all deliveries for a report
  getDeliveries: (reportId: string) =>
    api.get<{ success: boolean; data: ReportDelivery[] }>(`/reports/${reportId}/deliveries`),

  // Retry a failed delivery
  retryDelivery: (deliveryId: string) =>
    api.post<{ success: boolean; data: ReportDelivery; message: string }>(
      `/reports/deliveries/${deliveryId}/retry`
    ),
};

// Admin API Types
export interface SystemSettings {
  llmPrimaryProvider: string;
  llmDefaultModel: string;
  openaiApiKeyMasked: string;
  xaiApiKeyMasked: string;
  webexBotTokenMasked: string;
  reportRetentionDays: number;
}

export interface LLMProvider {
  id: string;
  name: string;
  models: Array<{ id: string; name: string }>;
}

export interface UpdateSettingsInput {
  llmPrimaryProvider?: string;
  llmDefaultModel?: string;
  openaiApiKey?: string;
  xaiApiKey?: string;
  webexBotToken?: string;
  reportRetentionDays?: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
}

// Template types
export interface TemplateConfiguration {
  sections?: string[];
  depth?: DepthPreference;
  competitiveOptions?: CompetitiveIntelligenceOptions;
  newsDigestOptions?: NewsDigestOptions;
  delivery?: WebexDeliveryInput;
  requestedFormats?: ReportFormat[];
}

export interface Template {
  id: string;
  userId: string;
  name: string;
  description?: string;
  workflowType: WorkflowType;
  configuration: TemplateConfiguration;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  workflowType: WorkflowType;
  configuration: TemplateConfiguration;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  configuration?: TemplateConfiguration;
}

export interface ListTemplatesParams {
  workflowType?: WorkflowType;
  limit?: number;
  offset?: number;
}

export interface ApplyTemplateInput {
  title: string;
  companyName?: string;
  companyNames?: string[];
  additionalContext?: Record<string, unknown>;
}

// Templates API
export const templatesAPI = {
  // Create a new template
  create: (data: CreateTemplateInput) =>
    api.post<{ success: boolean; data: Template; message: string }>('/templates', data),

  // List templates
  list: (params?: ListTemplatesParams) =>
    api.get<{
      success: boolean;
      data: Template[];
      pagination: { total: number; limit: number; offset: number };
    }>('/templates', { params }),

  // Get a specific template
  get: (id: string) =>
    api.get<{ success: boolean; data: Template }>(`/templates/${id}`),

  // Update a template
  update: (id: string, data: UpdateTemplateInput) =>
    api.put<{ success: boolean; data: Template; message: string }>(`/templates/${id}`, data),

  // Delete a template
  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/templates/${id}`),

  // Duplicate a template
  duplicate: (id: string) =>
    api.post<{ success: boolean; data: Template; message: string }>(`/templates/${id}/duplicate`),

  // Apply template to create a report
  apply: (id: string, data: ApplyTemplateInput) =>
    api.post<{ success: boolean; data: Report; message: string }>(`/templates/${id}/apply`, data),
};

// Schedule types
export type DeliveryMethod = 'DOWNLOAD' | 'WEBEX';

export interface Schedule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  templateId: string;
  template?: Template;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  deliveryMethod: DeliveryMethod;
  deliveryDestination?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  name: string;
  description?: string;
  templateId: string;
  cronExpression: string;
  timezone?: string;
  isActive?: boolean;
  deliveryMethod: DeliveryMethod;
  deliveryDestination?: string;
}

export interface UpdateScheduleInput {
  name?: string;
  description?: string;
  cronExpression?: string;
  timezone?: string;
  deliveryMethod?: DeliveryMethod;
  deliveryDestination?: string;
}

export interface ListSchedulesParams {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// Schedules API
export const schedulesAPI = {
  // Create a new schedule
  create: (data: CreateScheduleInput) =>
    api.post<{ success: boolean; data: Schedule; message: string }>('/schedules', data),

  // List schedules
  list: (params?: ListSchedulesParams) =>
    api.get<{
      success: boolean;
      data: Schedule[];
      pagination: { total: number; limit: number; offset: number };
    }>('/schedules', { params }),

  // Get a specific schedule
  get: (id: string) =>
    api.get<{ success: boolean; data: Schedule }>(`/schedules/${id}`),

  // Update a schedule
  update: (id: string, data: UpdateScheduleInput) =>
    api.put<{ success: boolean; data: Schedule; message: string }>(`/schedules/${id}`, data),

  // Delete a schedule
  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/schedules/${id}`),

  // Activate a schedule
  activate: (id: string) =>
    api.post<{ success: boolean; data: Schedule; message: string }>(`/schedules/${id}/activate`),

  // Deactivate a schedule
  deactivate: (id: string) =>
    api.post<{ success: boolean; data: Schedule; message: string }>(`/schedules/${id}/deactivate`),

  // Trigger immediate execution
  trigger: (id: string) =>
    api.post<{ success: boolean; data: Report; message: string }>(`/schedules/${id}/trigger`),

  // Get next run times
  getNextRuns: (id: string, count: number = 5) =>
    api.get<{ success: boolean; data: string[] }>(`/schedules/${id}/next-runs`, { params: { count } }),
};

// Admin API
export const adminAPI = {
  // Get system settings
  getSettings: () =>
    api.get<{ success: boolean; data: SystemSettings }>('/admin/settings'),

  // Update system settings
  updateSettings: (data: UpdateSettingsInput) =>
    api.put<{ success: boolean; data: SystemSettings; message: string }>('/admin/settings', data),

  // Get available LLM providers
  getProviders: () =>
    api.get<{ success: boolean; data: LLMProvider[] }>('/admin/providers'),

  // Test LLM connection
  testLLMConnection: (provider: string) =>
    api.post<{ success: boolean; data: ConnectionTestResult }>(`/admin/test-llm/${provider}`),

  // Test Webex connection
  testWebexConnection: () =>
    api.post<{ success: boolean; data: ConnectionTestResult }>('/admin/test-webex'),

  // User management
  listUsers: (params?: ListUsersParams) =>
    api.get<{
      success: boolean;
      data: AdminUser[];
      pagination: { total: number; limit: number; offset: number };
    }>('/admin/users', { params }),

  getUser: (id: string) =>
    api.get<{ success: boolean; data: AdminUser & { stats: UserStats } }>(`/admin/users/${id}`),

  createUser: (data: CreateUserInput) =>
    api.post<{ success: boolean; data: AdminUser; message: string }>('/admin/users', data),

  updateUser: (id: string, data: UpdateUserInput) =>
    api.put<{ success: boolean; data: AdminUser; message: string }>(`/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/users/${id}`),

  toggleUserActive: (id: string) =>
    api.post<{ success: boolean; data: AdminUser; message: string }>(`/admin/users/${id}/toggle-active`),

  resetUserPassword: (id: string, newPassword: string) =>
    api.post<{ success: boolean; message: string }>(`/admin/users/${id}/reset-password`, { newPassword }),

  // Data cleanup
  triggerCleanup: () =>
    api.post<{ success: boolean; data: CleanupStats; message: string }>('/admin/cleanup'),

  getCleanupStatus: () =>
    api.get<{ success: boolean; data: { isRunning: boolean } }>('/admin/cleanup/status'),
};

// Analytics Types
export interface DashboardSummary {
  totalReports: number;
  completedReports: number;
  failedReports: number;
  totalTemplates: number;
  totalSchedules: number;
  activeSchedules: number;
  totalUsers: number;
  activeUsers: number;
  reportsLast7Days: number;
  reportsLast30Days: number;
  avgGenerationTime: number;
  totalTokensUsed: number;
}

export interface ReportTrend {
  date: string;
  count: number;
  completed: number;
  failed: number;
}

export interface WorkflowDistribution {
  workflowType: WorkflowType;
  count: number;
  percentage: number;
}

export interface UserActivitySummary {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  reportCount: number;
  lastReportAt?: string;
}

export interface RecentActivityItem {
  id: string;
  type: 'report' | 'template' | 'schedule';
  action: string;
  title: string;
  userId: string;
  userEmail: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  userEmail?: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface TrendsParams {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface ActivityParams {
  limit?: number;
  offset?: number;
  userId?: string;
}

// User Management Types
export type UserRole = 'ADMIN' | 'USER';

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  reportsCreated: number;
  templatesCreated: number;
  schedulesCreated: number;
  lastActivity?: string;
}

export interface ListUsersParams {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CleanupStats {
  reportsDeleted: number;
  exportsDeleted: number;
  activitiesDeleted: number;
  analyticsDeleted: number;
  filesDeleted: number;
  bytesFreed: number;
  duration: number;
}

// Analytics API
export const analyticsAPI = {
  // Get dashboard summary
  getDashboard: () =>
    api.get<{ success: boolean; data: DashboardSummary }>('/analytics/dashboard'),

  // Get report trends
  getTrends: (params?: TrendsParams) =>
    api.get<{ success: boolean; data: ReportTrend[] }>('/analytics/trends', { params }),

  // Get workflow distribution
  getDistribution: (params?: { startDate?: string; endDate?: string }) =>
    api.get<{ success: boolean; data: WorkflowDistribution[] }>('/analytics/distribution', { params }),

  // Get recent activity
  getRecentActivity: (params?: { limit?: number }) =>
    api.get<{ success: boolean; data: RecentActivityItem[] }>('/analytics/activity', { params }),

  // Admin-only: Get top users
  getTopUsers: (params?: { limit?: number; period?: 'week' | 'month' | 'all' }) =>
    api.get<{ success: boolean; data: UserActivitySummary[] }>('/analytics/top-users', { params }),

  // Admin-only: Get activity log
  getActivityLog: (params?: ActivityParams) =>
    api.get<{
      success: boolean;
      data: ActivityLogItem[];
      pagination: { total: number; limit: number; offset: number };
    }>('/analytics/activity-log', { params }),
};

// Podcast API
export const podcastAPI = {
  // Request podcast generation for a report
  generate: (reportId: string, options: PodcastOptions) =>
    api.post<{ success: boolean; data: PodcastGeneration; message: string }>(
      `/reports/${reportId}/podcast`,
      options
    ),

  // Get podcast status with progress info
  getStatus: (reportId: string) =>
    api.get<{ success: boolean; data: PodcastStatusResponse }>(
      `/reports/${reportId}/podcast/status`
    ),

  // Get full podcast details
  getPodcast: (reportId: string) =>
    api.get<{ success: boolean; data: PodcastGeneration }>(
      `/reports/${reportId}/podcast`
    ),

  // Download podcast as blob for save-as
  download: async (reportId: string): Promise<Blob> => {
    const response = await api.get(`/reports/${reportId}/podcast/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Get available templates and duration info
  getTemplates: () =>
    api.get<{
      success: boolean;
      data: {
        templates: PodcastTemplateInfo[];
        durations: Record<PodcastDuration, PodcastDurationInfo>;
      };
    }>('/podcast/templates'),

  // Get cost estimate for a duration
  getCostEstimate: (duration: PodcastDuration) =>
    api.get<{
      success: boolean;
      data: {
        estimatedCost: number;
        breakdown: string;
        duration: PodcastDurationInfo;
      };
    }>(`/podcast/estimate?duration=${duration}`),

  // Delete podcast
  delete: (reportId: string) =>
    api.delete<{ success: boolean; message: string }>(`/reports/${reportId}/podcast`),
};

// Prompt Management API (Admin only)
export const promptAPI = {
  // List all prompts with optional category filter
  list: (category?: PromptCategory) =>
    api.get<{ success: boolean; data: PromptConfig[]; count: number }>(
      `/admin/prompts${category ? `?category=${category}` : ''}`
    ),

  // Get a single prompt by ID with versions
  getById: (id: string) =>
    api.get<{ success: boolean; data: PromptConfigWithVersions }>(`/admin/prompts/${id}`),

  // Update a prompt (creates new version)
  update: (id: string, data: UpdatePromptData) =>
    api.put<{ success: boolean; data: PromptConfig; message: string }>(
      `/admin/prompts/${id}`,
      data
    ),

  // Get version history for a prompt
  getVersionHistory: (id: string) =>
    api.get<{ success: boolean; data: PromptVersion[]; count: number }>(
      `/admin/prompts/${id}/versions`
    ),

  // Revert to a specific version
  revertToVersion: (id: string, version: number) =>
    api.post<{ success: boolean; data: PromptConfig; message: string }>(
      `/admin/prompts/${id}/revert/${version}`
    ),

  // Reset prompt to default
  resetToDefault: (id: string) =>
    api.post<{ success: boolean; data: PromptConfig; message: string }>(
      `/admin/prompts/${id}/reset`
    ),

  // Get cache statistics
  getCacheStats: () =>
    api.get<{ success: boolean; data: { size: number; keys: string[] } }>(
      `/admin/prompts/cache/stats`
    ),

  // Invalidate cache
  invalidateCache: (key?: string) =>
    api.post<{ success: boolean; message: string }>(
      `/admin/prompts/cache/invalidate`,
      { key }
    ),
};

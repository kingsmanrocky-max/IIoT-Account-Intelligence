// LLM Provider Types for IIoT Account Intelligence Platform

export type LLMProvider = 'openai' | 'xai';
export type LLMModel = 'gpt-4' | 'gpt-4-turbo' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo' | 'grok-2' | 'grok-2-mini';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionRequest {
  messages: LLMMessage[];
  model?: LLMModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface LLMCompletionResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  latencyMs: number;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

export interface LLMProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel: LLMModel;
  timeout?: number;
  maxRetries?: number;
}

export interface LLMServiceConfig {
  primaryProvider: LLMProvider;
  fallbackProvider?: LLMProvider;
  providers: {
    openai?: LLMProviderConfig;
    xai?: LLMProviderConfig;
  };
  defaultTemperature: number;
  defaultMaxTokens: number;
}

// Content Generation Types
export type WorkflowType = 'ACCOUNT_INTELLIGENCE' | 'COMPETITIVE_INTELLIGENCE' | 'NEWS_DIGEST';

// Depth preference for content generation
export type DepthPreference = 'brief' | 'standard' | 'detailed';

export type ReportSection =
  | 'account_overview'
  | 'financial_health'
  | 'security_events'
  | 'current_events'
  | 'executive_summary'
  | 'company_overview'
  | 'product_offerings'
  | 'competitive_positioning'
  | 'strengths_weaknesses'
  | 'cisco_analysis'
  | 'recommendations'
  | 'news_narrative';

export interface GenerationContext {
  workflowType: WorkflowType;
  section: ReportSection;
  companyName?: string;
  companyNames?: string[];
  additionalContext?: Record<string, unknown>;
  depth?: DepthPreference;
}

export interface GeneratedContent {
  section: ReportSection;
  content: string;
  metadata: {
    model: string;
    provider: LLMProvider;
    tokens: number;
    generatedAt: Date;
  };
}

// Data Enrichment Types
export interface CompanyEnrichmentRequest {
  companyName: string;
  additionalInfo?: string;
}

export interface CompanyEnrichmentResponse {
  originalName: string;
  validatedName: string;
  confidence: number;
  industry?: string;
  headquarters?: string;
  website?: string;
  description?: string;
  enrichedAt: Date;
}

// Podcast Generation Types
export type PodcastTemplate = 'executive_brief' | 'strategic_debate' | 'industry_pulse';
export type PodcastDuration = 'short' | 'standard' | 'extended'; // 5min, 10-15min, 15-20min

export interface PodcastSpeaker {
  id: string;
  name: string;
  role: string;
  voice: string; // TTS voice ID
}

export interface PodcastDialogue {
  speakerId: string;
  text: string;
  notes?: string; // tone, pace, emphasis
}

export interface PodcastSegment {
  title: string;
  duration: number; // seconds
  dialogues: PodcastDialogue[];
}

export interface PodcastScript {
  title: string;
  template: PodcastTemplate;
  speakers: PodcastSpeaker[];
  segments: PodcastSegment[];
  totalDuration: number;
  generatedAt: Date;
}

// Error Types
export class LLMError extends Error {
  constructor(
    message: string,
    public provider: LLMProvider,
    public code: string,
    public retryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(provider: LLMProvider, retryAfterMs?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 'RATE_LIMIT', true);
    this.name = 'LLMRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
  retryAfterMs?: number;
}

export class LLMTimeoutError extends LLMError {
  constructor(provider: LLMProvider, timeoutMs: number) {
    super(`Request timeout after ${timeoutMs}ms for ${provider}`, provider, 'TIMEOUT', true);
    this.name = 'LLMTimeoutError';
  }
}

export class LLMAuthError extends LLMError {
  constructor(provider: LLMProvider) {
    super(`Authentication failed for ${provider}`, provider, 'AUTH_ERROR', false);
    this.name = 'LLMAuthError';
  }
}
 

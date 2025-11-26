// LLM Provider Abstraction Layer
// Supports OpenAI and XAI (Grok) with a unified interface

import OpenAI from 'openai';
import axios, { AxiosInstance } from 'axios';
import {
  LLMProvider,
  LLMModel,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMProviderConfig,
  LLMError,
  LLMRateLimitError,
  LLMTimeoutError,
  LLMAuthError,
} from '../types/llm.types';
import logger from './logger';

// Abstract base class for LLM providers
export abstract class BaseLLMProvider {
  protected config: LLMProviderConfig;
  abstract readonly providerName: LLMProvider;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  abstract complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
  abstract testConnection(): Promise<boolean>;

  protected getModel(requestModel?: LLMModel): string {
    return requestModel || this.config.defaultModel;
  }
}

// OpenAI Provider Implementation
export class OpenAIProvider extends BaseLLMProvider {
  readonly providerName: LLMProvider = 'openai';
  private client: OpenAI;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 2,
    });
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const startTime = Date.now();
    const model = this.getModel(request.model);

    try {
      logger.debug(`OpenAI request: model=${model}, messages=${request.messages.length}`);

      const response = await this.client.chat.completions.create({
        model,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4000,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stop,
      });

      const latencyMs = Date.now() - startTime;
      const choice = response.choices[0];

      logger.debug(`OpenAI response: tokens=${response.usage?.total_tokens}, latency=${latencyMs}ms`);

      return {
        content: choice.message.content || '',
        model: response.model,
        provider: 'openai',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || 'stop',
        latencyMs,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  private handleError(error: unknown): LLMError {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        return new LLMRateLimitError('openai', retryAfter ? parseInt(retryAfter) * 1000 : undefined);
      }
      if (error.status === 401) {
        return new LLMAuthError('openai');
      }
      if (error.status === 408 || error.code === 'ETIMEDOUT') {
        return new LLMTimeoutError('openai', this.config.timeout || 30000);
      }
      return new LLMError(
        error.message,
        'openai',
        `HTTP_${error.status}`,
        error.status >= 500,
        error
      );
    }
    return new LLMError(
      error instanceof Error ? error.message : 'Unknown error',
      'openai',
      'UNKNOWN',
      false,
      error instanceof Error ? error : undefined
    );
  }
}

// XAI (Grok) Provider Implementation
export class XAIProvider extends BaseLLMProvider {
  readonly providerName: LLMProvider = 'xai';
  private client: AxiosInstance;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.x.ai/v1',
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const startTime = Date.now();
    const model = this.getModel(request.model);

    try {
      logger.debug(`XAI request: model=${model}, messages=${request.messages.length}`);

      const response = await this.client.post('/chat/completions', {
        model,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4000,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stop,
      });

      const latencyMs = Date.now() - startTime;
      const data = response.data;
      const choice = data.choices[0];

      logger.debug(`XAI response: tokens=${data.usage?.total_tokens}, latency=${latencyMs}ms`);

      return {
        content: choice.message.content || '',
        model: data.model,
        provider: 'xai',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || 'stop',
        latencyMs,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/models');
      return true;
    } catch {
      return false;
    }
  }

  private handleError(error: unknown): LLMError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'];
        return new LLMRateLimitError('xai', retryAfter ? parseInt(retryAfter) * 1000 : undefined);
      }
      if (status === 401) {
        return new LLMAuthError('xai');
      }
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new LLMTimeoutError('xai', this.config.timeout || 30000);
      }
      return new LLMError(
        error.message,
        'xai',
        `HTTP_${status}`,
        status ? status >= 500 : false,
        error
      );
    }
    return new LLMError(
      error instanceof Error ? error.message : 'Unknown error',
      'xai',
      'UNKNOWN',
      false,
      error instanceof Error ? error : undefined
    );
  }
}

// Provider Factory
export class LLMProviderFactory {
  private static providers: Map<LLMProvider, BaseLLMProvider> = new Map();

  static createProvider(provider: LLMProvider, config: LLMProviderConfig): BaseLLMProvider {
    let instance = this.providers.get(provider);

    if (!instance) {
      switch (provider) {
        case 'openai':
          instance = new OpenAIProvider(config);
          break;
        case 'xai':
          instance = new XAIProvider(config);
          break;
        default:
          throw new Error(`Unknown LLM provider: ${provider}`);
      }
      this.providers.set(provider, instance);
    }

    return instance;
  }

  static getProvider(provider: LLMProvider): BaseLLMProvider | undefined {
    return this.providers.get(provider);
  }

  static clearProviders(): void {
    this.providers.clear();
  }
}

export default LLMProviderFactory;

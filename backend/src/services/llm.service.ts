// LLM Service - Unified interface for AI content generation
// Supports multiple providers with automatic fallback and retry logic

import {
  LLMProvider,
  LLMModel,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMServiceConfig,
  LLMError,
  LLMRateLimitError,
  GenerationContext,
  GeneratedContent,
  WorkflowType,
  ReportSection,
  DepthPreference,
} from '../types/llm.types';
import { LLMProviderFactory, BaseLLMProvider } from '../utils/llm-providers';
import { getTemplateService, TemplateService } from './template.service';
import { env } from '../config/env';
import logger from '../utils/logger';
import {
  getProductsDescription,
  getIndustryDescription,
} from '../constants/cisco-products';

// Prompt Templates for different content types
const SYSTEM_PROMPTS = {
  ACCOUNT_INTELLIGENCE: `You are a professional business analyst specializing in IIoT (Industrial Internet of Things) and enterprise technology.
Your task is to generate accurate, well-researched content about companies for account intelligence reports.
Always cite sources when possible, distinguish between verified data and estimates, and maintain a professional, executive-briefing tone.
Format your responses for clarity with appropriate headers and bullet points when needed.`,

  COMPETITIVE_INTELLIGENCE: `You are a competitive intelligence analyst with deep expertise in the Cisco IIoT portfolio and industrial automation market.
Your task is to analyze competitors and provide strategic insights for sales teams.
Focus on competitive positioning, strengths/weaknesses, and actionable win strategies against Cisco IIoT solutions.
Be objective, data-driven, and provide specific recommendations.`,

  NEWS_DIGEST: `You are a business journalist specializing in industrial technology and enterprise markets.
Your task is to create executive news briefs that summarize recent developments across multiple companies.
Write in a narrative, journalistic style with a focus on relevance and impact.
Include dates and sources where available, and organize content thematically.`,

  DATA_ENRICHMENT: `You are a data validation specialist. Your task is to validate and enrich company information.
Return responses in valid JSON format only. Be conservative with confidence scores - only report high confidence when data is clearly verified.`,
};

const SECTION_PROMPTS: Record<ReportSection, string> = {
  account_overview: `Generate a comprehensive account overview including:
- Company description and core business
- Industry classification and market position
- Company size (employees, revenue if available)
- Key leadership and organizational structure
- Recent milestones and strategic initiatives
Target: 300-400 words`,

  financial_health: `Analyze the company's financial health including:
- Revenue trends and growth trajectory
- Profitability indicators
- Credit rating and financial stability
- Recent funding or investment activity
- Financial outlook and analyst perspectives
Target: 250-350 words`,

  security_events: `Research and summarize security-related events including:
- Recent data breaches or security incidents
- Compliance status and regulatory issues
- Known vulnerabilities or security concerns
- Security posture and investments
- Industry security benchmarking
Target: 200-300 words`,

  current_events: `Compile recent news and developments including:
- Press releases and announcements (last 90 days)
- Product launches and innovations
- Partnerships and strategic alliances
- Market expansion or restructuring
- Leadership changes
Target: 250-350 words`,

  executive_summary: `Create an executive summary that synthesizes key findings:
- Critical business insights
- Strategic opportunities
- Risk factors
- Recommended actions
Target: 150-200 words`,

  company_overview: `Provide a detailed company overview for competitive analysis:
- Company background and history
- Core products and services
- Target markets and customer segments
- Geographic presence
- Technology stack and capabilities
Target: 300-400 words`,

  product_offerings: `Analyze the company's product and service portfolio:
- Key product lines and solutions
- Technology differentiators
- Pricing model and market positioning
- Recent product innovations
- Product roadmap (if known)
Target: 300-400 words`,

  competitive_positioning: `Assess the company's competitive positioning:
- Market share and ranking
- Key competitors and rivalry
- Competitive advantages
- Market trends affecting position
- Strategic moves and acquisitions
Target: 250-350 words`,

  strengths_weaknesses: `Conduct a SWOT-style analysis:
Strengths:
- Core competencies
- Market advantages
- Resource strengths

Weaknesses:
- Operational gaps
- Market vulnerabilities
- Resource limitations
Target: 300-400 words`,

  cisco_analysis: `Analyze how this competitor positions against Cisco IIoT solutions:
- Head-to-head comparison with Cisco offerings
- Win/loss patterns
- Messaging and positioning against Cisco
- Customer overlap and competition intensity
- Cisco advantages to leverage
Target: 300-400 words`,

  recommendations: `Provide actionable recommendations for sales teams:
- Key selling points against this competitor
- Objection handling strategies
- Proof points and case studies to reference
- Partner and ecosystem considerations
- Deal strategy recommendations
Target: 250-350 words`,

  news_narrative: `Create a narrative news digest covering all specified companies:
- Organize by theme or company
- Include dates and sources
- Highlight trends and patterns
- Executive-friendly format
- Forward-looking insights
Target: 500-700 words`,
};

export class LLMService {
  private config: LLMServiceConfig;
  private primaryProvider: BaseLLMProvider | null = null;
  private fallbackProvider: BaseLLMProvider | null = null;
  private templateService: TemplateService;
  private promptService: any; // Will be imported dynamically to avoid circular deps

  constructor() {
    this.config = this.loadConfig();
    this.templateService = getTemplateService();
    this.initializeProviders();
    this.initializePromptService();
  }

  private async initializePromptService(): Promise<void> {
    try {
      const { getPromptService } = await import('./prompt.service');
      this.promptService = getPromptService();
    } catch (error) {
      logger.warn('Prompt service not available, using fallback prompts');
    }
  }

  private loadConfig(): LLMServiceConfig {
    return {
      primaryProvider: (env.LLM_PRIMARY_PROVIDER as LLMProvider) || 'openai',
      fallbackProvider: env.LLM_FALLBACK_PROVIDER as LLMProvider | undefined,
      providers: {
        openai: env.OPENAI_API_KEY
          ? {
              apiKey: env.OPENAI_API_KEY,
              defaultModel: (env.OPENAI_DEFAULT_MODEL as LLMModel) || 'gpt-4',
              timeout: env.LLM_TIMEOUT || 30000,
              maxRetries: env.LLM_MAX_RETRIES || 2,
            }
          : undefined,
        xai: env.XAI_API_KEY
          ? {
              apiKey: env.XAI_API_KEY,
              defaultModel: (env.XAI_DEFAULT_MODEL as LLMModel) || 'grok-2',
              timeout: env.LLM_TIMEOUT || 30000,
              maxRetries: env.LLM_MAX_RETRIES || 2,
            }
          : undefined,
      },
      defaultTemperature: env.LLM_DEFAULT_TEMPERATURE || 0.7,
      defaultMaxTokens: env.LLM_DEFAULT_MAX_TOKENS || 4000,
    };
  }

  private initializeProviders(): void {
    const { primaryProvider, fallbackProvider, providers } = this.config;

    // Initialize primary provider
    const primaryConfig = providers[primaryProvider];
    if (primaryConfig) {
      this.primaryProvider = LLMProviderFactory.createProvider(primaryProvider, primaryConfig);
      logger.info(`LLM primary provider initialized: ${primaryProvider}`);
    } else {
      logger.warn(`Primary LLM provider ${primaryProvider} not configured`);
    }

    // Initialize fallback provider
    if (fallbackProvider && fallbackProvider !== primaryProvider) {
      const fallbackConfig = providers[fallbackProvider];
      if (fallbackConfig) {
        this.fallbackProvider = LLMProviderFactory.createProvider(fallbackProvider, fallbackConfig);
        logger.info(`LLM fallback provider initialized: ${fallbackProvider}`);
      }
    }
  }

  // Main completion method with fallback logic
  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    if (!this.primaryProvider) {
      throw new LLMError('No LLM provider configured', 'openai', 'NO_PROVIDER', false);
    }

    try {
      return await this.executeWithRetry(this.primaryProvider, request);
    } catch (error) {
      if (this.fallbackProvider && error instanceof LLMError && error.retryable) {
        logger.warn(`Primary provider failed, attempting fallback: ${error.message}`);
        try {
          return await this.executeWithRetry(this.fallbackProvider, request);
        } catch (fallbackError) {
          logger.error(`Fallback provider also failed: ${fallbackError}`);
          throw error; // Throw original error
        }
      }
      throw error;
    }
  }

  private async executeWithRetry(
    provider: BaseLLMProvider,
    request: LLMCompletionRequest,
    maxRetries: number = 3
  ): Promise<LLMCompletionResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await provider.complete(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof LLMRateLimitError && error.retryAfterMs) {
          logger.warn(`Rate limited, waiting ${error.retryAfterMs}ms before retry ${attempt}/${maxRetries}`);
          await this.sleep(error.retryAfterMs);
        } else if (error instanceof LLMError && error.retryable && attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.warn(`Retrying after ${backoffMs}ms (attempt ${attempt}/${maxRetries}): ${error.message}`);
          await this.sleep(backoffMs);
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Generate content for a specific report section
  async generateSection(context: GenerationContext, useTemplates: boolean = true): Promise<GeneratedContent> {
    let systemPrompt: string;
    let userPrompt: string;

    // Try to use template service first
    if (useTemplates) {
      const compiledTemplate = this.templateService.compileTemplate(
        context.workflowType,
        context.section,
        {
          companyName: context.companyName,
          companyNames: context.companyNames,
          additionalContext: context.additionalContext,
        }
      );

      if (compiledTemplate) {
        systemPrompt = compiledTemplate.systemPrompt;
        userPrompt = compiledTemplate.userPrompt;
        logger.debug(`Using template ${compiledTemplate.metadata.id} for ${context.workflowType}:${context.section}`);
      } else {
        // Fall back to inline prompts
        systemPrompt = await this.getSystemPrompt(context.workflowType);
        const sectionPrompt = await this.getSectionPrompt(context.section);
        userPrompt = this.buildUserPrompt(context, sectionPrompt);
        logger.debug(`No template found, using inline prompts for ${context.workflowType}:${context.section}`);
      }
    } else {
      // Use inline prompts
      systemPrompt = await this.getSystemPrompt(context.workflowType);
      const sectionPrompt = await this.getSectionPrompt(context.section);
      userPrompt = this.buildUserPrompt(context, sectionPrompt);
    }

    const response = await this.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: await this.getTemperature(context.workflowType),
      maxTokens: this.getMaxTokensByDepth(context.depth),
    });

    return {
      section: context.section,
      content: response.content,
      metadata: {
        model: response.model,
        provider: response.provider,
        tokens: response.usage.totalTokens,
        generatedAt: new Date(),
      },
    };
  }

  // Get template service for external access
  getTemplateService(): TemplateService {
    return this.templateService;
  }

  private async getSystemPrompt(workflowType: WorkflowType): Promise<string> {
    // Try to get prompt from database first
    if (this.promptService) {
      try {
        const prompt = await this.promptService.getPromptByKey(`${workflowType}:system`);
        if (prompt) {
          return prompt.promptText;
        }
      } catch (error) {
        logger.warn(`Failed to fetch prompt from database for ${workflowType}, using fallback`, error);
      }
    }

    // Fallback to hardcoded prompts
    switch (workflowType) {
      case 'ACCOUNT_INTELLIGENCE':
        return SYSTEM_PROMPTS.ACCOUNT_INTELLIGENCE;
      case 'COMPETITIVE_INTELLIGENCE':
        return SYSTEM_PROMPTS.COMPETITIVE_INTELLIGENCE;
      case 'NEWS_DIGEST':
        return SYSTEM_PROMPTS.NEWS_DIGEST;
      default:
        return SYSTEM_PROMPTS.ACCOUNT_INTELLIGENCE;
    }
  }

  private async getTemperature(workflowType: WorkflowType): Promise<number> {
    // Try to get temperature from database prompt configuration
    if (this.promptService) {
      try {
        const prompt = await this.promptService.getPromptByKey(`${workflowType}:system`);
        if (prompt?.parameters && typeof prompt.parameters === 'object' && 'temperature' in prompt.parameters) {
          return (prompt.parameters as any).temperature;
        }
      } catch (error) {
        logger.warn(`Failed to fetch temperature from database for ${workflowType}, using fallback`, error);
      }
    }

    // Fallback to hardcoded values
    switch (workflowType) {
      case 'ACCOUNT_INTELLIGENCE':
        return 0.5;
      case 'COMPETITIVE_INTELLIGENCE':
        return 0.6;
      case 'NEWS_DIGEST':
        return 0.7;
      default:
        return this.config.defaultTemperature;
    }
  }

  private async getSectionPrompt(section: string): Promise<string> {
    // Try to get section prompt from database first
    if (this.promptService) {
      try {
        const prompt = await this.promptService.getPromptByKey(`section:${section}`);
        if (prompt) {
          return prompt.promptText;
        }
      } catch (error) {
        logger.warn(`Failed to fetch section prompt from database for ${section}, using fallback`, error);
      }
    }

    // Fallback to hardcoded prompts
    return SECTION_PROMPTS[section as keyof typeof SECTION_PROMPTS] || '';
  }

  private buildUserPrompt(context: GenerationContext, sectionPrompt: string): string {
    let prompt = '';

    if (context.companyName) {
      prompt += `Company: ${context.companyName}\n\n`;
    } else if (context.companyNames && context.companyNames.length > 0) {
      prompt += `Companies: ${context.companyNames.join(', ')}\n\n`;
    }

    prompt += sectionPrompt;

    // Add Competitive Intelligence specific context
    if (context.workflowType === 'COMPETITIVE_INTELLIGENCE' && context.additionalContext?.competitiveOptions) {
      const ciOptions = context.additionalContext.competitiveOptions as {
        selectedProducts?: string[];
        focusIndustry?: string;
      };

      // Add selected Cisco products context
      if (ciOptions.selectedProducts && ciOptions.selectedProducts.length > 0) {
        const productsDescription = getProductsDescription(ciOptions.selectedProducts);
        prompt += `\n\n--- CISCO IIoT PRODUCTS TO COMPARE ---\nFocus the competitive analysis on these specific Cisco IIoT products:\n${productsDescription}`;
      }

      // Add industry focus context
      if (ciOptions.focusIndustry) {
        const industryDescription = getIndustryDescription(ciOptions.focusIndustry);
        if (industryDescription) {
          prompt += `\n\n--- INDUSTRY FOCUS ---\n${industryDescription}\nTailor the analysis and recommendations to this industry context.`;
        }
      }
    }

    // Add News Digest specific context
    if (context.workflowType === 'NEWS_DIGEST' && context.additionalContext?.newsDigestOptions) {
      const ndOptions = context.additionalContext.newsDigestOptions as {
        newsFocus?: string[];
        timePeriod?: string;
        industryFilter?: string;
        outputStyle?: string;
      };

      // Add news focus topics
      if (ndOptions.newsFocus && ndOptions.newsFocus.length > 0) {
        const focusLabels: Record<string, string> = {
          'technology': 'Technology & Innovation',
          'financials': 'Financial Performance',
          'leadership': 'Leadership Changes',
          'ma-activity': 'M&A Activity',
          'market-expansion': 'Market Expansion',
          'sustainability': 'Sustainability & ESG',
        };
        const focusTopics = ndOptions.newsFocus.map(f => focusLabels[f] || f).join(', ');
        prompt += `\n\n--- NEWS FOCUS ---\nPrioritize coverage of these topics: ${focusTopics}`;
      }

      // Add time period context
      if (ndOptions.timePeriod) {
        const periodDays: Record<string, number> = {
          'last-week': 7,
          'last-month': 30,
          'last-quarter': 90,
        };
        const days = periodDays[ndOptions.timePeriod] || 30;
        prompt += `\n\n--- TIME PERIOD ---\nFocus on news and developments from the last ${days} days.`;
      }

      // Add industry filter context
      if (ndOptions.industryFilter) {
        const industryDescription = getIndustryDescription(ndOptions.industryFilter);
        if (industryDescription) {
          prompt += `\n\n--- INDUSTRY CONTEXT ---\n${industryDescription}\nTailor the news digest to this industry context.`;
        }
      }

      // Add output style instructions
      if (ndOptions.outputStyle) {
        const styleInstructions: Record<string, string> = {
          'executive-brief': 'Use bullet points, lead with key metrics and highlights, keep paragraphs short and scannable.',
          'narrative': 'Write in flowing prose with storytelling format, connecting events into a cohesive narrative.',
          'podcast-ready': 'Write conversationally as if being read aloud, use natural transitions and engaging language.',
        };
        prompt += `\n\n--- OUTPUT STYLE ---\n${styleInstructions[ndOptions.outputStyle] || ''}`;
      }
    }

    // Handle other additional context (excluding competitiveOptions and newsDigestOptions which are already processed)
    if (context.additionalContext) {
      const { competitiveOptions, newsDigestOptions, ...otherContext } = context.additionalContext as Record<string, unknown>;
      if (Object.keys(otherContext).length > 0) {
        prompt += `\n\nAdditional context: ${JSON.stringify(otherContext)}`;
      }
    }

    // Apply depth-based instructions
    if (context.depth === 'brief') {
      prompt += '\n\nIMPORTANT: Keep this section concise (100-150 words). Focus on the most critical points only. Use bullet points where appropriate for quick scanning.';
    } else if (context.depth === 'detailed') {
      prompt += '\n\nIMPORTANT: Provide comprehensive, in-depth analysis (500-800 words). Include specific examples, data points, citations where available, and detailed explanations. Offer nuanced insights and thorough coverage of the topic.';
    }

    return prompt;
  }

  // Get max tokens based on depth preference
  private getMaxTokensByDepth(depth?: DepthPreference): number {
    const tokensByDepth = {
      brief: 1000,
      standard: 4000,
      detailed: 6000,
    };
    return tokensByDepth[depth || 'standard'];
  }

  // Data enrichment for company validation
  async enrichCompanyData(companyName: string, additionalInfo?: string): Promise<Record<string, unknown>> {
    const prompt = `Validate and enrich the following company information:
Company name: ${companyName}
${additionalInfo ? `Additional info: ${additionalInfo}` : ''}

Return a JSON object with the following structure:
{
  "validatedName": "Official company name",
  "confidence": 0.0-1.0,
  "industry": "Primary industry",
  "headquarters": "City, Country",
  "website": "company website URL",
  "description": "Brief company description (1-2 sentences)",
  "stockSymbol": "If publicly traded",
  "employeeCount": "Approximate employee range",
  "founded": "Year founded"
}

Only include fields where you have reliable information. Return ONLY valid JSON, no additional text.`;

    const response = await this.complete({
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.DATA_ENRICHMENT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2, // Low temperature for factual data
      maxTokens: 500,
    });

    try {
      return JSON.parse(response.content);
    } catch {
      logger.error('Failed to parse company enrichment response as JSON');
      return {
        validatedName: companyName,
        confidence: 0.3,
        error: 'Failed to parse response',
      };
    }
  }

  // Test provider connectivity
  async testConnection(provider?: LLMProvider): Promise<{ provider: LLMProvider; connected: boolean }[]> {
    const results: { provider: LLMProvider; connected: boolean }[] = [];

    if (provider) {
      const p = LLMProviderFactory.getProvider(provider);
      if (p) {
        results.push({ provider, connected: await p.testConnection() });
      }
    } else {
      if (this.primaryProvider) {
        results.push({
          provider: this.primaryProvider.providerName,
          connected: await this.primaryProvider.testConnection(),
        });
      }
      if (this.fallbackProvider) {
        results.push({
          provider: this.fallbackProvider.providerName,
          connected: await this.fallbackProvider.testConnection(),
        });
      }
    }

    return results;
  }

  // Get available providers
  getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (this.config.providers.openai) providers.push('openai');
    if (this.config.providers.xai) providers.push('xai');
    return providers;
  }

  // Get current configuration (without sensitive data)
  getConfig(): Omit<LLMServiceConfig, 'providers'> & { providers: string[] } {
    return {
      primaryProvider: this.config.primaryProvider,
      fallbackProvider: this.config.fallbackProvider,
      providers: this.getAvailableProviders(),
      defaultTemperature: this.config.defaultTemperature,
      defaultMaxTokens: this.config.defaultMaxTokens,
    };
  }
}

// Singleton instance
let llmServiceInstance: LLMService | null = null;

export function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
  }
  return llmServiceInstance;
}

export default LLMService;

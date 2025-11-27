// Admin Service - Handles system configuration management
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Encryption key from environment (32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const IV_LENGTH = 16;

// System configuration keys
export const CONFIG_KEYS = {
  LLM_PRIMARY_PROVIDER: 'llm_primary_provider',
  LLM_DEFAULT_MODEL: 'llm_default_model',
  OPENAI_API_KEY: 'openai_api_key',
  XAI_API_KEY: 'xai_api_key',
  WEBEX_BOT_TOKEN: 'webex_bot_token',
  WEBEX_WEBHOOK_SECRET: 'webex_webhook_secret',
  REPORT_RETENTION_DAYS: 'report_retention_days',
} as const;

// Sensitive keys that should be encrypted
const SENSITIVE_KEYS = [
  CONFIG_KEYS.OPENAI_API_KEY,
  CONFIG_KEYS.XAI_API_KEY,
  CONFIG_KEYS.WEBEX_BOT_TOKEN,
  CONFIG_KEYS.WEBEX_WEBHOOK_SECRET,
];

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function maskSensitiveValue(value: string): string {
  if (!value || value.length <= 8) return '********';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

export interface SystemSettings {
  llmPrimaryProvider: string;
  llmDefaultModel: string;
  openaiApiKey: string;
  openaiApiKeyMasked: string;
  xaiApiKey: string;
  xaiApiKeyMasked: string;
  webexBotToken: string;
  webexBotTokenMasked: string;
  webexWebhookSecret: string;
  webexWebhookSecretMasked: string;
  reportRetentionDays: number;
}

export class AdminService {
  // Get all system settings
  async getSettings(): Promise<SystemSettings> {
    const configs = await prisma.systemConfig.findMany();
    const configMap = new Map(configs.map((c) => [c.key, c]));

    const getValue = (key: string, defaultValue: string = ''): string => {
      const config = configMap.get(key);
      if (!config) return defaultValue;
      if (config.isEncrypted) {
        try {
          return decrypt(config.value);
        } catch {
          return defaultValue;
        }
      }
      return config.value;
    };

    const openaiKey = getValue(CONFIG_KEYS.OPENAI_API_KEY, process.env.OPENAI_API_KEY || '');
    const xaiKey = getValue(CONFIG_KEYS.XAI_API_KEY, process.env.XAI_API_KEY || '');
    const webexToken = getValue(CONFIG_KEYS.WEBEX_BOT_TOKEN, process.env.WEBEX_BOT_TOKEN || '');
    const webexWebhookSecret = getValue(CONFIG_KEYS.WEBEX_WEBHOOK_SECRET, process.env.WEBEX_WEBHOOK_SECRET || '');

    return {
      llmPrimaryProvider: getValue(CONFIG_KEYS.LLM_PRIMARY_PROVIDER, process.env.LLM_PRIMARY_PROVIDER || 'openai'),
      llmDefaultModel: getValue(CONFIG_KEYS.LLM_DEFAULT_MODEL, process.env.OPENAI_DEFAULT_MODEL || 'gpt-4'),
      openaiApiKey: openaiKey,
      openaiApiKeyMasked: maskSensitiveValue(openaiKey),
      xaiApiKey: xaiKey,
      xaiApiKeyMasked: maskSensitiveValue(xaiKey),
      webexBotToken: webexToken,
      webexBotTokenMasked: maskSensitiveValue(webexToken),
      webexWebhookSecret: webexWebhookSecret,
      webexWebhookSecretMasked: maskSensitiveValue(webexWebhookSecret),
      reportRetentionDays: parseInt(getValue(CONFIG_KEYS.REPORT_RETENTION_DAYS, '90'), 10),
    };
  }

  // Get settings for display (masked sensitive values)
  async getSettingsForDisplay(): Promise<Omit<SystemSettings, 'openaiApiKey' | 'xaiApiKey' | 'webexBotToken' | 'webexWebhookSecret'>> {
    const settings = await this.getSettings();
    return {
      llmPrimaryProvider: settings.llmPrimaryProvider,
      llmDefaultModel: settings.llmDefaultModel,
      openaiApiKeyMasked: settings.openaiApiKeyMasked,
      xaiApiKeyMasked: settings.xaiApiKeyMasked,
      webexBotTokenMasked: settings.webexBotTokenMasked,
      webexWebhookSecretMasked: settings.webexWebhookSecretMasked,
      reportRetentionDays: settings.reportRetentionDays,
    };
  }

  // Update a single setting
  async updateSetting(key: string, value: string): Promise<void> {
    const isSensitive = SENSITIVE_KEYS.includes(key as any);
    const storedValue = isSensitive ? encrypt(value) : value;

    await prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: storedValue,
        isEncrypted: isSensitive,
        description: this.getKeyDescription(key),
      },
      update: {
        value: storedValue,
        isEncrypted: isSensitive,
      },
    });

    logger.info(`System config updated: ${key}`);
  }

  // Update multiple settings at once
  async updateSettings(settings: Partial<{
    llmPrimaryProvider: string;
    llmDefaultModel: string;
    openaiApiKey: string;
    xaiApiKey: string;
    webexBotToken: string;
    webexWebhookSecret: string;
    reportRetentionDays: number;
  }>): Promise<void> {
    const updates: Promise<void>[] = [];

    if (settings.llmPrimaryProvider !== undefined) {
      updates.push(this.updateSetting(CONFIG_KEYS.LLM_PRIMARY_PROVIDER, settings.llmPrimaryProvider));
    }
    if (settings.llmDefaultModel !== undefined) {
      updates.push(this.updateSetting(CONFIG_KEYS.LLM_DEFAULT_MODEL, settings.llmDefaultModel));
    }
    if (settings.openaiApiKey !== undefined && settings.openaiApiKey !== '') {
      updates.push(this.updateSetting(CONFIG_KEYS.OPENAI_API_KEY, settings.openaiApiKey));
    }
    if (settings.xaiApiKey !== undefined && settings.xaiApiKey !== '') {
      updates.push(this.updateSetting(CONFIG_KEYS.XAI_API_KEY, settings.xaiApiKey));
    }
    if (settings.webexBotToken !== undefined && settings.webexBotToken !== '') {
      updates.push(this.updateSetting(CONFIG_KEYS.WEBEX_BOT_TOKEN, settings.webexBotToken));
    }
    if (settings.webexWebhookSecret !== undefined && settings.webexWebhookSecret !== '') {
      updates.push(this.updateSetting(CONFIG_KEYS.WEBEX_WEBHOOK_SECRET, settings.webexWebhookSecret));
    }
    if (settings.reportRetentionDays !== undefined) {
      updates.push(this.updateSetting(CONFIG_KEYS.REPORT_RETENTION_DAYS, settings.reportRetentionDays.toString()));
    }

    await Promise.all(updates);
  }

  // Test LLM connection
  async testLLMConnection(provider: string): Promise<{ success: boolean; message: string; latency?: number }> {
    const settings = await this.getSettings();
    const startTime = Date.now();

    try {
      if (provider === 'openai') {
        const { OpenAI } = await import('openai');
        const client = new OpenAI({ apiKey: settings.openaiApiKey });

        const response = await client.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Say "Connection successful" in exactly those words.' }],
          max_tokens: 10,
        });

        const latency = Date.now() - startTime;
        return {
          success: true,
          message: `OpenAI connection successful. Model: gpt-4`,
          latency,
        };
      } else if (provider === 'xai') {
        // X.ai uses OpenAI-compatible API
        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: settings.xaiApiKey,
          baseURL: 'https://api.x.ai/v1',
        });

        const response = await client.chat.completions.create({
          model: 'grok-2-latest',
          messages: [{ role: 'user', content: 'Say "Connection successful" in exactly those words.' }],
          max_tokens: 10,
        });

        const latency = Date.now() - startTime;
        return {
          success: true,
          message: `X.ai connection successful. Model: grok-2-latest`,
          latency,
        };
      }

      return { success: false, message: `Unknown provider: ${provider}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`LLM connection test failed for ${provider}:`, error);
      return { success: false, message: `Connection failed: ${message}` };
    }
  }

  // Test Webex connection
  async testWebexConnection(): Promise<{ success: boolean; message: string }> {
    const settings = await this.getSettings();

    try {
      const response = await fetch('https://webexapis.com/v1/people/me', {
        headers: {
          Authorization: `Bearer ${settings.webexBotToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json() as any;
        return {
          success: true,
          message: `Webex connection successful. Bot: ${data.displayName || data.emails?.[0] || 'Connected'}`,
        };
      } else {
        const error = await response.text();
        return { success: false, message: `Webex connection failed: ${error}` };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Webex connection test failed:', error);
      return { success: false, message: `Connection failed: ${message}` };
    }
  }

  // Get available LLM providers
  getAvailableProviders(): Array<{ id: string; name: string; models: Array<{ id: string; name: string }> }> {
    return [
      {
        id: 'openai',
        name: 'OpenAI',
        models: [
          { id: 'gpt-4', name: 'GPT-4' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
          { id: 'gpt-5.1', name: 'GPT-5.1' },
        ],
      },
      {
        id: 'xai',
        name: 'X.ai (Grok)',
        models: [
          { id: 'grok-2-latest', name: 'Grok 2' },
          { id: 'grok-beta', name: 'Grok Beta' },
          { id: 'grok-4-fast-reasoning', name: 'Grok 4 Fast' },
        ],
      },
    ];
  }

  private getKeyDescription(key: string): string {
    const descriptions: Record<string, string> = {
      [CONFIG_KEYS.LLM_PRIMARY_PROVIDER]: 'Primary LLM provider (openai or xai)',
      [CONFIG_KEYS.LLM_DEFAULT_MODEL]: 'Default LLM model for report generation',
      [CONFIG_KEYS.OPENAI_API_KEY]: 'OpenAI API key',
      [CONFIG_KEYS.XAI_API_KEY]: 'X.ai API key',
      [CONFIG_KEYS.WEBEX_BOT_TOKEN]: 'Webex bot access token',
      [CONFIG_KEYS.WEBEX_WEBHOOK_SECRET]: 'Webex webhook secret for signature validation',
      [CONFIG_KEYS.REPORT_RETENTION_DAYS]: 'Number of days to retain reports',
    };
    return descriptions[key] || key;
  }
}

// Singleton instance
let adminServiceInstance: AdminService | null = null;

export function getAdminService(): AdminService {
  if (!adminServiceInstance) {
    adminServiceInstance = new AdminService();
  }
  return adminServiceInstance;
}

export default AdminService;

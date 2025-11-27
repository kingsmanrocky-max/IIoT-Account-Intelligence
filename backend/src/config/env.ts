import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4001', 10),
  apiUrl: process.env.API_URL || 'http://localhost:4001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Authentication
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiration: process.env.JWT_EXPIRATION || '7d',
  refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '30d',

  // Encryption
  encryptionKey: process.env.ENCRYPTION_KEY!,

  // LLM Provider Configuration
  openaiApiKey: process.env.OPENAI_API_KEY,
  xaiApiKey: process.env.XAI_API_KEY,
  llmPrimaryProvider: process.env.LLM_PRIMARY_PROVIDER || 'openai',
  llmFallbackProvider: process.env.LLM_FALLBACK_PROVIDER,
  openaiDefaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4',
  xaiDefaultModel: process.env.XAI_DEFAULT_MODEL || 'grok-2',
  llmTimeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
  llmMaxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3', 10),
  llmDefaultTemperature: parseFloat(process.env.LLM_DEFAULT_TEMPERATURE || '0.7'),
  llmDefaultMaxTokens: parseInt(process.env.LLM_DEFAULT_MAX_TOKENS || '4000', 10),

  // Webex
  webexBotToken: process.env.WEBEX_BOT_TOKEN,
  webexWebhookSecret: process.env.WEBEX_WEBHOOK_SECRET,

  // File Storage
  storagePath: process.env.STORAGE_PATH || './storage/reports',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),

  // Podcast Configuration
  podcastStoragePath: process.env.PODCAST_STORAGE_PATH || './storage/podcasts',
  podcastAssetsPath: process.env.PODCAST_ASSETS_PATH || './assets/podcast',
  openaiTtsModel: process.env.OPENAI_TTS_MODEL || 'tts-1-hd',
  podcastMaxConcurrentTTS: parseInt(process.env.PODCAST_MAX_CONCURRENT_TTS || '3', 10),
  podcastPollIntervalMs: parseInt(process.env.PODCAST_POLL_INTERVAL_MS || '10000', 10),
  podcastExpirationHours: parseInt(process.env.PODCAST_EXPIRATION_HOURS || '72', 10),

  // Report Settings
  reportRetentionDays: parseInt(process.env.REPORT_RETENTION_DAYS || '90', 10),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFilePath: process.env.LOG_FILE_PATH || './logs',

  // Redis
  redisUrl: process.env.REDIS_URL,
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Flattened exports for easier access
export const env = {
  ...config,
  // LLM specific aliases
  OPENAI_API_KEY: config.openaiApiKey,
  XAI_API_KEY: config.xaiApiKey,
  LLM_PRIMARY_PROVIDER: config.llmPrimaryProvider,
  LLM_FALLBACK_PROVIDER: config.llmFallbackProvider,
  OPENAI_DEFAULT_MODEL: config.openaiDefaultModel,
  XAI_DEFAULT_MODEL: config.xaiDefaultModel,
  LLM_TIMEOUT: config.llmTimeout,
  LLM_MAX_RETRIES: config.llmMaxRetries,
  LLM_DEFAULT_TEMPERATURE: config.llmDefaultTemperature,
  LLM_DEFAULT_MAX_TOKENS: config.llmDefaultMaxTokens,
};

export default config;

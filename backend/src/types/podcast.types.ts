import { TTSVoice, PodcastTemplate, PodcastDuration, PodcastStatus, PodcastTrigger } from '@prisma/client';

// Dialogue and script types
export interface PodcastDialogue {
  speakerId: string;
  text: string;
  notes?: string; // tone, pace, emphasis hints
}

export interface PodcastSegment {
  type: 'intro' | 'content' | 'analysis' | 'outro';
  title: string;
  dialogues: PodcastDialogue[];
}

export interface PodcastScriptMetadata {
  model: string;
  provider: string;
  tokens: number;
  generatedAt: Date;
}

export interface PodcastScript {
  title: string;
  description: string;
  segments: PodcastSegment[];
  metadata?: PodcastScriptMetadata;
}

// Audio segment types
export interface AudioSegment {
  index: number;
  speakerId: string;
  text: string;
  filePath: string;
  durationMs: number;
  voice: TTSVoice;
  fileSize: number;
}

// TTS types
export interface TTSSegment {
  speakerId: string;
  text: string;
  pacing?: 'slow' | 'normal' | 'energetic';
  emphasis?: string[];
}

export interface AudioSegmentResult {
  speakerId: string;
  text: string;
  filePath: string;
  duration: number; // seconds
  characterCount: number;
}

// Audio processing types
export interface AudioProcessingOptions {
  podcastId: string;
  segments: AudioSegmentResult[];
  pauseBetweenSpeakers: number; // milliseconds
  includeBackgroundMusic: boolean;
  introMusicPath?: string;
  outroMusicPath?: string;
  backgroundMusicPath?: string;
  backgroundMusicVolume: number; // 0.0 - 1.0
  normalizeAudio: boolean;
  outputBitrate: string; // e.g., '192k'
}

export interface ProcessedPodcast {
  filePath: string;
  duration: number; // seconds
  fileSize: number; // bytes
}

// Podcast options for report creation
export interface PodcastOptions {
  enabled: boolean;
  template: PodcastTemplate;
  duration: PodcastDuration;
}

// Host configuration
export interface PodcastHostConfig {
  id: string;
  name: string;
  role: string;
  personality: string;
  voice: TTSVoice;
  voiceSpeed: number;
  personalityPrompt?: string;
}

// Voice mapping
export interface VoiceConfig {
  voiceId: string;
  speed: number;
  description?: string;
}

export const VOICE_MAPPING: Record<string, VoiceConfig> = {
  // Executive Brief hosts
  sarah: { voiceId: 'nova', speed: 1.0, description: 'Professional host' },
  marcus: { voiceId: 'echo', speed: 1.0, description: 'Industry analyst' },

  // Strategic Debate hosts
  jordan: { voiceId: 'shimmer', speed: 1.0, description: 'Neutral moderator' },
  morgan: { voiceId: 'onyx', speed: 1.05, description: 'Strategist' },
  taylor: { voiceId: 'fable', speed: 1.0, description: 'Market analyst' },

  // Industry Pulse hosts
  riley: { voiceId: 'nova', speed: 1.1, description: 'News anchor' },
  casey: { voiceId: 'echo', speed: 1.0, description: 'Reporter' },
  drew: { voiceId: 'alloy', speed: 1.0, description: 'Reporter' },
};

// Template segment structure
export interface PodcastTemplateSegment {
  type: string;
  durationPercent: number;
  speakers: string[];
  description: string;
}

export interface PodcastTemplateStructure {
  segments: PodcastTemplateSegment[];
  wordsPerMinute: number;
}

// Duration configuration
export const DURATION_CONFIG: Record<PodcastDuration, { minutes: number; wordCount: number }> = {
  SHORT: { minutes: 5, wordCount: 775 },
  STANDARD: { minutes: 12, wordCount: 1860 },
  LONG: { minutes: 18, wordCount: 2790 },
};

// Cost estimation
export interface PodcastCostEstimate {
  scriptGeneration: { tokens: number; cost: number };
  ttsGeneration: { characters: number; cost: number };
  totalCost: number;
  breakdown: string;
}

// Status progress mapping
export const STATUS_PROGRESS: Record<PodcastStatus, { progress: number; message: string }> = {
  PENDING: { progress: 0, message: 'Queued for processing' },
  GENERATING_SCRIPT: { progress: 25, message: 'Generating podcast script...' },
  GENERATING_AUDIO: { progress: 50, message: 'Converting to speech...' },
  MIXING: { progress: 85, message: 'Mixing audio tracks...' },
  COMPLETED: { progress: 100, message: 'Podcast ready' },
  FAILED: { progress: 0, message: 'Generation failed' },
};

// Request/Response types
export interface GeneratePodcastRequest {
  template: PodcastTemplate;
  duration: PodcastDuration;
}

export interface PodcastStatusResponse {
  status: PodcastStatus;
  progress: number;
  message: string;
  error?: string;
}

export interface PodcastDownloadResponse {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

// Re-export Prisma types for convenience
export { TTSVoice, PodcastTemplate, PodcastDuration, PodcastStatus, PodcastTrigger };

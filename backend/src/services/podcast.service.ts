// Podcast Service - Main orchestration service for podcast generation
import {
  PrismaClient,
  PodcastGeneration,
  PodcastStatus,
  PodcastTemplate,
  PodcastDuration,
  PodcastTrigger,
  Report,
} from '@prisma/client';
import { config } from '../config/env';
import logger from '../utils/logger';
import { getLLMService, LLMService } from './llm.service';
import { getTTSService, TTSService } from './tts.service';
import { getAudioProcessorService, AudioProcessorService } from './audio-processor.service';
import {
  PodcastScript,
  TTSSegment,
  DURATION_CONFIG,
  STATUS_PROGRESS,
  PodcastCostEstimate,
  PodcastStatusResponse,
} from '../types/podcast.types';

const prisma = new PrismaClient();

// System prompts for different podcast templates
const PODCAST_SYSTEM_PROMPTS: Record<PodcastTemplate, string> = {
  EXECUTIVE_BRIEF: `You are a podcast script writer creating an executive brief podcast with two hosts:
- Sarah (host): Professional, articulate senior analyst who guides the conversation
- Marcus (analyst): Industry expert who provides deep insights and market context

Create a conversational but professional dialogue that:
- Opens with a compelling hook about the company/topic
- Delivers key insights in an engaging, conversational format
- Uses natural transitions and follow-up questions
- Concludes with actionable takeaways for business leaders

The tone should be authoritative yet accessible, like a high-quality business podcast.`,

  STRATEGIC_DEBATE: `You are a podcast script writer creating a strategic debate podcast with three hosts:
- Jordan (moderator): Neutral, balanced host who guides the discussion
- Morgan (strategist): Bold, forward-thinking strategic advisor
- Taylor (analyst): Data-driven market analyst who provides grounded perspectives

Create a dynamic debate where:
- Jordan poses key strategic questions
- Morgan and Taylor offer contrasting viewpoints
- The debate explores multiple angles of the topic
- Discussion includes specific evidence and examples
- Conclusion synthesizes the key insights

The tone should be intellectually engaging with respectful disagreement and collaboration.`,

  INDUSTRY_PULSE: `You are a podcast script writer creating an industry news podcast with three hosts:
- Riley (anchor): Energetic news anchor who drives the pace
- Casey (reporter): Field reporter who provides context and details
- Drew (analyst): Quick-witted analyst who offers rapid insights

Create a fast-paced news show that:
- Leads with the most important story
- Covers multiple news items efficiently
- Includes brief analysis for each item
- Uses crisp transitions between topics
- Ends with forward-looking predictions

The tone should be dynamic and newsy, like a professional business news program.`,
};

// Template segment structures
const TEMPLATE_STRUCTURES: Record<PodcastTemplate, { segments: string[]; speakers: string[] }> = {
  EXECUTIVE_BRIEF: {
    segments: ['intro', 'overview', 'analysis', 'insights', 'outro'],
    speakers: ['sarah', 'marcus'],
  },
  STRATEGIC_DEBATE: {
    segments: ['intro', 'topic_setup', 'debate_round_1', 'debate_round_2', 'synthesis', 'outro'],
    speakers: ['jordan', 'morgan', 'taylor'],
  },
  INDUSTRY_PULSE: {
    segments: ['intro', 'headline_1', 'headline_2', 'headline_3', 'wrap_up'],
    speakers: ['riley', 'casey', 'drew'],
  },
};

export interface PodcastGenerationRequest {
  reportId: string;
  userId: string;
  template: PodcastTemplate;
  duration: PodcastDuration;
  triggeredBy?: PodcastTrigger;
  deliveryEnabled?: boolean;
  deliveryDestination?: string;
  deliveryDestinationType?: 'email' | 'roomId';
}

export class PodcastService {
  private llmService: LLMService;
  private ttsService: TTSService;
  private audioProcessor: AudioProcessorService;
  private promptService: any; // Will be imported dynamically

  constructor() {
    this.llmService = getLLMService();
    this.ttsService = getTTSService();
    this.audioProcessor = getAudioProcessorService();
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

  // Request a new podcast generation
  async requestPodcast(request: PodcastGenerationRequest): Promise<PodcastGeneration> {
    const {
      reportId,
      template,
      duration,
      triggeredBy = 'ON_DEMAND',
      deliveryEnabled,
      deliveryDestination,
      deliveryDestinationType = 'email',
    } = request;

    // Check if report exists and is completed
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { podcastGeneration: true },
    });

    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    if (report.status !== 'COMPLETED') {
      throw new Error(`Report is not completed: ${report.status}`);
    }

    // Check if there's already a podcast for this report
    if (report.podcastGeneration) {
      // If it's completed or in progress, return existing
      if (['COMPLETED', 'PENDING', 'GENERATING_SCRIPT', 'GENERATING_AUDIO', 'MIXING'].includes(report.podcastGeneration.status)) {
        logger.info(`Podcast already exists for report ${reportId}: ${report.podcastGeneration.status}`);
        return report.podcastGeneration;
      }

      // If failed, we can retry - delete the old one
      if (report.podcastGeneration.status === 'FAILED') {
        await prisma.podcastGeneration.delete({
          where: { id: report.podcastGeneration.id },
        });
      }
    }

    // Estimate cost
    const costEstimate = this.estimateCost(duration);

    // Create new podcast generation record
    const podcast = await prisma.podcastGeneration.create({
      data: {
        reportId,
        template,
        duration,
        triggeredBy,
        status: 'PENDING',
        estimatedCost: costEstimate.totalCost,
        expiresAt: new Date(Date.now() + config.podcastExpirationHours * 60 * 60 * 1000),
      },
    });

    // Create delivery record if delivery is enabled
    if (deliveryEnabled && deliveryDestination) {
      await prisma.podcastDelivery.create({
        data: {
          podcastId: podcast.id,
          method: 'WEBEX',
          destination: deliveryDestination,
          destinationType: deliveryDestinationType,
          status: 'PENDING',
        },
      });
      logger.info(`Podcast delivery scheduled for ${podcast.id} to ${deliveryDestination}`);
    }

    logger.info(`Podcast generation requested: ${podcast.id} for report ${reportId}`);

    return podcast;
  }

  // Get podcast by ID
  async getPodcast(podcastId: string): Promise<PodcastGeneration | null> {
    return prisma.podcastGeneration.findUnique({
      where: { id: podcastId },
    });
  }

  // Get podcast by report ID
  async getPodcastByReportId(reportId: string): Promise<PodcastGeneration | null> {
    return prisma.podcastGeneration.findUnique({
      where: { reportId },
    });
  }

  // Get podcast status with progress
  async getPodcastStatus(reportId: string): Promise<PodcastStatusResponse> {
    const podcast = await prisma.podcastGeneration.findUnique({
      where: { reportId },
    });

    if (!podcast) {
      return {
        status: 'PENDING' as PodcastStatus,
        progress: 0,
        message: 'No podcast found',
      };
    }

    const statusInfo = STATUS_PROGRESS[podcast.status];

    return {
      status: podcast.status,
      progress: statusInfo.progress,
      message: statusInfo.message,
      error: podcast.error || undefined,
    };
  }

  // Main processing method - called by the processor
  async processPodcast(podcastId: string): Promise<void> {
    const podcast = await prisma.podcastGeneration.findUnique({
      where: { id: podcastId },
      include: { report: true },
    });

    if (!podcast) {
      throw new Error(`Podcast not found: ${podcastId}`);
    }

    if (!podcast.report) {
      throw new Error(`Report not found for podcast: ${podcastId}`);
    }

    logger.info(`Processing podcast ${podcastId}: ${podcast.template} - ${podcast.duration}`);

    try {
      // Update status to started
      await this.updatePodcastStatus(podcastId, 'GENERATING_SCRIPT', {
        startedAt: new Date(),
      });

      // Stage 1: Generate script
      const script = await this.generateScript(podcast, podcast.report);

      await prisma.podcastGeneration.update({
        where: { id: podcastId },
        data: {
          script: script as unknown as Record<string, unknown>,
          scriptTokens: script.metadata?.tokens || 0,
          scriptGeneratedAt: new Date(),
        },
      });

      // Stage 2: Generate TTS segments
      await this.updatePodcastStatus(podcastId, 'GENERATING_AUDIO');

      const ttsSegments = this.scriptToTTSSegments(script);
      const audioSegments = await this.ttsService.generateAllSegments(
        ttsSegments,
        podcastId,
        (completed, total) => {
          logger.debug(`TTS progress: ${completed}/${total}`);
        }
      );

      await prisma.podcastGeneration.update({
        where: { id: podcastId },
        data: {
          audioSegments: audioSegments as unknown as Record<string, unknown>[],
          audioSegmentCount: audioSegments.length,
        },
      });

      // Stage 3: Mix audio
      await this.updatePodcastStatus(podcastId, 'MIXING');

      const processedPodcast = await this.audioProcessor.processPodcast({
        podcastId,
        segments: audioSegments,
        pauseBetweenSpeakers: 500,
        template: podcast.template,
        normalizeAudio: true,
        outputBitrate: '192k',
      });

      // Stage 4: Complete
      await prisma.podcastGeneration.update({
        where: { id: podcastId },
        data: {
          status: 'COMPLETED',
          finalAudioPath: processedPodcast.filePath,
          durationSeconds: processedPodcast.duration,
          fileSizeBytes: BigInt(processedPodcast.fileSize),
          completedAt: new Date(),
          error: null,
        },
      });

      logger.info(`Podcast completed: ${podcastId}, ${processedPodcast.duration}s`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Podcast processing failed: ${podcastId}`, error);

      await prisma.podcastGeneration.update({
        where: { id: podcastId },
        data: {
          status: 'FAILED',
          error: errorMessage,
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }

  // Get podcast system prompt from database or fallback
  private async getPodcastSystemPrompt(template: PodcastTemplate): Promise<string> {
    // Try to get prompt from database first
    if (this.promptService) {
      try {
        const prompt = await this.promptService.getPromptByKey(`PODCAST:${template}:system`);
        if (prompt) {
          return prompt.promptText;
        }
      } catch (error) {
        logger.warn(`Failed to fetch podcast prompt from database for ${template}, using fallback`, error);
      }
    }

    // Fallback to hardcoded prompts
    return PODCAST_SYSTEM_PROMPTS[template];
  }

  // Get temperature from database or fallback
  private async getPodcastTemperature(template: PodcastTemplate): Promise<number> {
    // Try to get temperature from database prompt configuration
    if (this.promptService) {
      try {
        const prompt = await this.promptService.getPromptByKey(`PODCAST:${template}:system`);
        if (prompt?.parameters && typeof prompt.parameters === 'object' && 'temperature' in prompt.parameters) {
          return (prompt.parameters as any).temperature;
        }
      } catch (error) {
        logger.warn(`Failed to fetch temperature from database for ${template}, using fallback`, error);
      }
    }

    // Fallback to hardcoded value
    return 0.8;
  }

  // Generate podcast script using LLM
  private async generateScript(
    podcast: PodcastGeneration,
    report: Report
  ): Promise<PodcastScript> {
    const durationConfig = DURATION_CONFIG[podcast.duration];
    const templateStructure = TEMPLATE_STRUCTURES[podcast.template];
    const systemPrompt = await this.getPodcastSystemPrompt(podcast.template);

    // Build context from report
    const reportContent = this.extractReportContent(report);

    // Calculate minimum dialogues needed for target duration
    // Average speaking rate: ~155 words/minute
    // Average dialogue: ~25-30 words (1-3 sentences)
    const targetDialogues = Math.ceil((durationConfig.wordCount / 25));

    const userPrompt = `Create a podcast script based on the following intelligence report:

REPORT TITLE: ${report.title}
REPORT TYPE: ${report.workflowType}

REPORT CONTENT:
${reportContent}

CRITICAL REQUIREMENTS:
- Target length: ${durationConfig.minutes} minutes (EXACTLY ${durationConfig.wordCount} words total)
- You MUST generate at least ${targetDialogues} dialogue entries to reach the target word count
- Format: ${podcast.template.replace('_', ' ')}
- Speakers: ${templateStructure.speakers.join(', ')}

OUTPUT FORMAT (JSON):
{
  "title": "Episode title",
  "description": "Brief episode description",
  "segments": [
    {
      "type": "intro|content|analysis|outro",
      "title": "Segment title",
      "dialogues": [
        {
          "speakerId": "speaker_name",
          "text": "What they say (natural, conversational, 20-35 words)",
          "notes": "optional: tone hints like 'enthusiastic', 'thoughtful'"
        }
      ]
    }
  ]
}

Important:
- Make the dialogue natural and conversational
- Include specific data points and insights from the report
- Use speaker names in lowercase (${templateStructure.speakers.join(', ')})
- Each dialogue should be 20-35 words (1-3 sentences) for natural pacing
- Generate enough dialogues to reach ${durationConfig.wordCount} total words
- DO NOT stop early - continue generating content until you reach the target word count
- Return ONLY valid JSON, no additional text`;

    // Calculate max tokens needed for response
    // JSON structure overhead + dialogue content
    // Rough estimate: wordCount * 1.5 tokens per word + 2000 for structure
    const estimatedMaxTokens = Math.ceil(durationConfig.wordCount * 1.5) + 2000;

    const response = await this.llmService.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'gpt-4o',
      temperature: await this.getPodcastTemperature(podcast.template),
      maxTokens: estimatedMaxTokens,
    });

    // Parse the script
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('No JSON found in GPT-4o response. First 500 chars:', response.content.substring(0, 500));
        throw new Error('No JSON found in response');
      }

      const script = JSON.parse(jsonMatch[0]) as PodcastScript;

      // Add metadata
      script.metadata = {
        model: response.model,
        provider: response.provider,
        tokens: response.usage.totalTokens,
        generatedAt: new Date(),
      };

      logger.info(`Script generated: ${script.title}, ${script.segments.length} segments`);

      return script;
    } catch (parseError) {
      logger.error('Failed to parse podcast script:', parseError);
      throw new Error(`Failed to parse podcast script: ${parseError}`);
    }
  }

  // Extract readable content from report
  private extractReportContent(report: Report): string {
    const generatedContent = report.generatedContent as Record<string, unknown> | null;

    if (!generatedContent) {
      return 'No content available';
    }

    const sections: string[] = [];

    // Extract sections based on workflow type
    const sectionKeys = Object.keys(generatedContent);

    for (const key of sectionKeys) {
      const section = generatedContent[key] as { content?: string } | string;
      if (typeof section === 'object' && section.content) {
        sections.push(`## ${key.replace(/_/g, ' ').toUpperCase()}\n${section.content}`);
      } else if (typeof section === 'string') {
        sections.push(`## ${key.replace(/_/g, ' ').toUpperCase()}\n${section}`);
      }
    }

    return sections.join('\n\n');
  }

  // Convert script to TTS segments
  private scriptToTTSSegments(script: PodcastScript): TTSSegment[] {
    const segments: TTSSegment[] = [];

    for (const segment of script.segments) {
      for (const dialogue of segment.dialogues) {
        segments.push({
          speakerId: dialogue.speakerId,
          text: dialogue.text,
          pacing: this.getPacingFromNotes(dialogue.notes),
        });
      }
    }

    return segments;
  }

  // Parse pacing from dialogue notes
  private getPacingFromNotes(notes?: string): 'slow' | 'normal' | 'energetic' {
    if (!notes) return 'normal';

    const lower = notes.toLowerCase();
    if (lower.includes('slow') || lower.includes('thoughtful') || lower.includes('measured')) {
      return 'slow';
    }
    if (lower.includes('energetic') || lower.includes('excited') || lower.includes('enthusiastic')) {
      return 'energetic';
    }
    return 'normal';
  }

  // Update podcast status
  private async updatePodcastStatus(
    podcastId: string,
    status: PodcastStatus,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    await prisma.podcastGeneration.update({
      where: { id: podcastId },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  // Estimate cost for podcast generation
  estimateCost(duration: PodcastDuration): PodcastCostEstimate {
    const durationConfig = DURATION_CONFIG[duration];

    // LLM cost estimate (GPT-4o: $0.005/1K input, $0.015/1K output)
    // Average cost per 1K tokens: ~$0.01 (assuming 50/50 input/output ratio)
    const estimatedTokens = durationConfig.wordCount * 2; // rough estimate
    const llmCost = (estimatedTokens / 1000) * 0.01;

    // TTS cost (OpenAI TTS-HD: $30/1M characters)
    const avgCharsPerWord = 5;
    const totalCharacters = durationConfig.wordCount * avgCharsPerWord;
    const ttsCost = this.ttsService.estimateCost(totalCharacters);

    const totalCost = llmCost + ttsCost.cost;

    return {
      scriptGeneration: {
        tokens: estimatedTokens,
        cost: Math.round(llmCost * 1000) / 1000,
      },
      ttsGeneration: {
        characters: totalCharacters,
        cost: ttsCost.cost,
      },
      totalCost: Math.round(totalCost * 1000) / 1000,
      breakdown: `Script (~${estimatedTokens} tokens): $${llmCost.toFixed(3)}, TTS (${totalCharacters.toLocaleString()} chars): $${ttsCost.cost.toFixed(3)}`,
    };
  }

  // Get pending podcasts for processing
  async getPendingPodcasts(limit: number = 10): Promise<PodcastGeneration[]> {
    return prisma.podcastGeneration.findMany({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });
  }

  // Get failed podcasts eligible for retry
  async getRetryablePodcasts(limit: number = 5): Promise<PodcastGeneration[]> {
    // Use raw query to compare retryCount < maxRetries
    return prisma.$queryRaw<PodcastGeneration[]>`
      SELECT * FROM "PodcastGeneration"
      WHERE status = 'FAILED'
        AND "retryCount" < "maxRetries"
      ORDER BY "updatedAt" ASC
      LIMIT ${limit}
    `;
  }

  // Alternative simpler method - just use hardcoded max
  async getRetryablePodcastsSimple(limit: number = 5): Promise<PodcastGeneration[]> {
    return prisma.podcastGeneration.findMany({
      where: {
        status: 'FAILED',
        retryCount: {
          lt: 3, // Default maxRetries value
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
      take: limit,
    });
  }

  // Delete podcast and its files
  async deletePodcast(podcastId: string): Promise<void> {
    const podcast = await prisma.podcastGeneration.findUnique({
      where: { id: podcastId },
    });

    if (!podcast) {
      throw new Error(`Podcast not found: ${podcastId}`);
    }

    // Delete audio files
    await this.audioProcessor.deletePodcastFiles(podcastId);

    // Delete TTS segments
    await this.ttsService.cleanupTempFiles(podcastId);

    // Delete database record
    await prisma.podcastGeneration.delete({
      where: { id: podcastId },
    });

    logger.info(`Podcast deleted: ${podcastId}`);
  }

  // Cleanup expired podcasts
  async cleanupExpiredPodcasts(): Promise<number> {
    const expiredPodcasts = await prisma.podcastGeneration.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    let deleted = 0;
    for (const podcast of expiredPodcasts) {
      try {
        await this.deletePodcast(podcast.id);
        deleted++;
      } catch (error) {
        logger.error(`Failed to cleanup expired podcast ${podcast.id}:`, error);
      }
    }

    if (deleted > 0) {
      logger.info(`Cleaned up ${deleted} expired podcasts`);
    }

    return deleted;
  }

  // Check if FFmpeg is available
  async checkFFmpegAvailable(): Promise<boolean> {
    return this.audioProcessor.checkFFmpegAvailable();
  }

  // Test TTS connection
  async testTTSConnection(): Promise<boolean> {
    return this.ttsService.testConnection();
  }
}

// Singleton instance
let podcastServiceInstance: PodcastService | null = null;

export function getPodcastService(): PodcastService {
  if (!podcastServiceInstance) {
    podcastServiceInstance = new PodcastService();
  }
  return podcastServiceInstance;
}

export default PodcastService;

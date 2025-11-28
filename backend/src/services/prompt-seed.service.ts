// Prompt Seed Service - Automatically seeds default prompts on first startup
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Default prompt configurations
const DEFAULT_PROMPTS = {
  REPORT_SYSTEM: {
    ACCOUNT_INTELLIGENCE: {
      name: 'ACCOUNT INTELLIGENCE System Prompt',
      description: 'System prompt for account intelligence reports',
      promptText: `You are a professional business analyst specializing in IIoT (Industrial Internet of Things) and enterprise technology.
Your task is to generate accurate, well-researched content about companies for account intelligence reports.
Always cite sources when possible, distinguish between verified data and estimates, and maintain a professional, executive-briefing tone.
Format your responses for clarity with appropriate headers and bullet points when needed.`,
      parameters: { temperature: 0.5, maxTokens: 4000 },
      supportedVariables: ['companyName', 'workflowType'],
    },
    COMPETITIVE_INTELLIGENCE: {
      name: 'COMPETITIVE INTELLIGENCE System Prompt',
      description: 'System prompt for competitive intelligence reports',
      promptText: `You are a competitive intelligence analyst with deep expertise in the Cisco IIoT portfolio and industrial automation market.
Your task is to analyze competitors and provide strategic insights for sales teams.
Focus on competitive positioning, strengths/weaknesses, and actionable win strategies against Cisco IIoT solutions.
Be objective, data-driven, and provide specific recommendations.`,
      parameters: { temperature: 0.6, maxTokens: 4000 },
      supportedVariables: ['companyName', 'workflowType'],
    },
    NEWS_DIGEST: {
      name: 'NEWS DIGEST System Prompt',
      description: 'System prompt for news digest reports',
      promptText: `You are a business journalist specializing in industrial technology and enterprise markets.
Your task is to create executive news briefs that summarize recent developments across multiple companies.
Write in a narrative, journalistic style with a focus on relevance and impact.
Include dates and sources where available, and organize content thematically.`,
      parameters: { temperature: 0.7, maxTokens: 4000 },
      supportedVariables: ['companyName', 'workflowType'],
    },
  },
  REPORT_SECTION: {
    account_overview: {
      name: 'Account Overview Section',
      description: 'Prompt for account overview section',
      promptText: `Generate a comprehensive account overview including:
- Company description and core business
- Industry classification and market position
- Company size (employees, revenue if available)
- Key leadership and organizational structure
- Recent milestones and strategic initiatives
Target: 300-400 words`,
      parameters: { maxTokens: 4000 },
      supportedVariables: ['companyName', 'sectionData'],
    },
    financial_health: {
      name: 'Financial Health Section',
      description: 'Prompt for financial health section',
      promptText: `Analyze the company's financial health including:
- Revenue trends and growth trajectory
- Profitability indicators
- Credit rating and financial stability
- Recent funding or investment activity
- Financial outlook and analyst perspectives
Target: 250-350 words`,
      parameters: { maxTokens: 4000 },
      supportedVariables: ['companyName', 'sectionData'],
    },
    security_events: {
      name: 'Security Events Section',
      description: 'Prompt for security events section',
      promptText: `Research and summarize security-related events including:
- Recent data breaches or security incidents
- Compliance status and regulatory issues
- Known vulnerabilities or security concerns
- Security posture and investments
- Industry security benchmarking
Target: 200-300 words`,
      parameters: { maxTokens: 4000 },
      supportedVariables: ['companyName', 'sectionData'],
    },
    current_events: {
      name: 'Current Events Section',
      description: 'Prompt for current events section',
      promptText: `Compile recent news and developments including:
- Press releases and announcements (last 90 days)
- Product launches and innovations
- Partnerships and strategic alliances
- Market expansion or restructuring
- Leadership changes
Target: 250-350 words`,
      parameters: { maxTokens: 4000 },
      supportedVariables: ['companyName', 'sectionData'],
    },
  },
  PODCAST_SYSTEM: {
    EXECUTIVE_BRIEF: {
      name: 'EXECUTIVE BRIEF Podcast Template',
      description: 'System prompt for executive brief podcast template',
      promptText: `You are a podcast script writer creating an executive brief podcast with two hosts:
- Sarah (host): Professional, articulate senior analyst who guides the conversation
- Marcus (analyst): Industry expert who provides deep insights and market context

Create a conversational but professional dialogue that:
- Opens with a compelling hook about the company/topic
- Delivers key insights in an engaging, conversational format
- Uses natural transitions and follow-up questions
- Concludes with actionable takeaways for business leaders

The tone should be authoritative yet accessible, like a high-quality business podcast.`,
      parameters: { temperature: 0.8, maxTokens: 8000 },
      supportedVariables: ['reportContent', 'duration', 'template'],
    },
    STRATEGIC_DEBATE: {
      name: 'STRATEGIC DEBATE Podcast Template',
      description: 'System prompt for strategic debate podcast template',
      promptText: `You are a podcast script writer creating a strategic debate podcast with three hosts:
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
      parameters: { temperature: 0.8, maxTokens: 8000 },
      supportedVariables: ['reportContent', 'duration', 'template'],
    },
    INDUSTRY_PULSE: {
      name: 'INDUSTRY PULSE Podcast Template',
      description: 'System prompt for industry pulse podcast template',
      promptText: `You are a podcast script writer creating an industry news podcast with three hosts:
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
      parameters: { temperature: 0.8, maxTokens: 8000 },
      supportedVariables: ['reportContent', 'duration', 'template'],
    },
  },
};

export class PromptSeedService {
  async seedDefaultPrompts(): Promise<{ created: number; skipped: number }> {
    try {
      // Check if prompts already exist
      const existingCount = await prisma.promptConfig.count();

      if (existingCount > 0) {
        logger.info(`Prompt seed skipped: ${existingCount} prompts already exist`);
        return { created: 0, skipped: existingCount };
      }

      logger.info('No prompts found, seeding default prompts...');

      let created = 0;

      // Seed Report System Prompts
      for (const [key, config] of Object.entries(DEFAULT_PROMPTS.REPORT_SYSTEM)) {
        try {
          await prisma.promptConfig.create({
            data: {
              key: `${key}:system`,
              name: config.name,
              description: config.description,
              category: 'REPORT_SYSTEM',
              promptText: config.promptText,
              parameters: config.parameters,
              supportedVariables: config.supportedVariables,
              isDefault: true,
              isActive: true,
              currentVersion: 1,
              versions: {
                create: {
                  version: 1,
                  promptText: config.promptText,
                  parameters: config.parameters,
                  changeReason: 'Initial default version',
                },
              },
            },
          });
          created++;
          logger.debug(`Created prompt: ${config.name}`);
        } catch (error: any) {
          if (error.code !== 'P2002') {
            logger.error(`Failed to create prompt ${config.name}:`, error);
          }
        }
      }

      // Seed Report Section Prompts
      for (const [key, config] of Object.entries(DEFAULT_PROMPTS.REPORT_SECTION)) {
        try {
          await prisma.promptConfig.create({
            data: {
              key: `section:${key}`,
              name: config.name,
              description: config.description,
              category: 'REPORT_SECTION',
              promptText: config.promptText,
              parameters: config.parameters,
              supportedVariables: config.supportedVariables,
              isDefault: true,
              isActive: true,
              currentVersion: 1,
              versions: {
                create: {
                  version: 1,
                  promptText: config.promptText,
                  parameters: config.parameters,
                  changeReason: 'Initial default version',
                },
              },
            },
          });
          created++;
          logger.debug(`Created prompt: ${config.name}`);
        } catch (error: any) {
          if (error.code !== 'P2002') {
            logger.error(`Failed to create prompt ${config.name}:`, error);
          }
        }
      }

      // Seed Podcast System Prompts
      for (const [key, config] of Object.entries(DEFAULT_PROMPTS.PODCAST_SYSTEM)) {
        try {
          await prisma.promptConfig.create({
            data: {
              key: `PODCAST:${key}:system`,
              name: config.name,
              description: config.description,
              category: 'PODCAST_SYSTEM',
              promptText: config.promptText,
              parameters: config.parameters,
              supportedVariables: config.supportedVariables,
              isDefault: true,
              isActive: true,
              currentVersion: 1,
              versions: {
                create: {
                  version: 1,
                  promptText: config.promptText,
                  parameters: config.parameters,
                  changeReason: 'Initial default version',
                },
              },
            },
          });
          created++;
          logger.debug(`Created prompt: ${config.name}`);
        } catch (error: any) {
          if (error.code !== 'P2002') {
            logger.error(`Failed to create prompt ${config.name}:`, error);
          }
        }
      }

      logger.info(`✓ Seed complete: ${created} default prompts created`);
      return { created, skipped: 0 };
    } catch (error) {
      logger.error('Error seeding default prompts:', error);
      throw error;
    }
  }
}

// Singleton instance
let promptSeedServiceInstance: PromptSeedService | null = null;

export function getPromptSeedService(): PromptSeedService {
  if (!promptSeedServiceInstance) {
    promptSeedServiceInstance = new PromptSeedService();
  }
  return promptSeedServiceInstance;
}

export default PromptSeedService;

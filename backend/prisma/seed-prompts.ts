import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extract prompts from llm.service.ts and podcast.service.ts
const REPORT_SYSTEM_PROMPTS = {
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
};

const REPORT_SECTION_PROMPTS = {
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

const PODCAST_SYSTEM_PROMPTS = {
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

async function seedPrompts() {
  console.log('🌱 Seeding prompt configurations...');

  const prompts: any[] = [];

  // Report System Prompts
  for (const [workflow, promptText] of Object.entries(REPORT_SYSTEM_PROMPTS)) {
    prompts.push({
      key: `${workflow}:system`,
      name: `${workflow.replace(/_/g, ' ')} System Prompt`,
      description: `System prompt for ${workflow.replace(/_/g, ' ').toLowerCase()} reports`,
      category: 'REPORT_SYSTEM',
      promptText,
      parameters: {
        temperature: workflow === 'ACCOUNT_INTELLIGENCE' ? 0.5 : workflow === 'COMPETITIVE_INTELLIGENCE' ? 0.6 : 0.7,
        maxTokens: 4000,
      },
      supportedVariables: ['companyName', 'workflowType'],
      isDefault: true,
      isActive: true,
    });
  }

  // Report Section Prompts
  for (const [section, promptText] of Object.entries(REPORT_SECTION_PROMPTS)) {
    prompts.push({
      key: `section:${section}`,
      name: `${section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Section`,
      description: `Prompt for ${section.replace(/_/g, ' ')} section`,
      category: 'REPORT_SECTION',
      promptText,
      parameters: {
        maxTokens: 4000,
      },
      supportedVariables: ['companyName', 'sectionData'],
      isDefault: true,
      isActive: true,
    });
  }

  // Podcast System Prompts
  for (const [template, promptText] of Object.entries(PODCAST_SYSTEM_PROMPTS)) {
    prompts.push({
      key: `PODCAST:${template}:system`,
      name: `${template.replace(/_/g, ' ')} Podcast Template`,
      description: `System prompt for ${template.replace(/_/g, ' ').toLowerCase()} podcast template`,
      category: 'PODCAST_SYSTEM',
      promptText,
      parameters: {
        temperature: 0.8,
        maxTokens: 8000,
      },
      supportedVariables: ['reportContent', 'duration', 'template'],
      isDefault: true,
      isActive: true,
    });
  }

  // Create all prompts with initial version
  let created = 0;
  for (const promptData of prompts) {
    try {
      await prisma.promptConfig.create({
        data: {
          ...promptData,
          currentVersion: 1,
          versions: {
            create: {
              version: 1,
              promptText: promptData.promptText,
              parameters: promptData.parameters,
              changeReason: 'Initial default version',
            },
          },
        },
      });
      created++;
      console.log(`  ✓ Created: ${promptData.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`  ⊘ Skipped (already exists): ${promptData.name}`);
      } else {
        console.error(`  ✗ Error creating ${promptData.name}:`, error.message);
      }
    }
  }

  console.log(`\n✨ Seed complete: ${created} prompts created`);
}

seedPrompts()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

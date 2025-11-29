// Template Service - Manages prompt templates for LLM content generation
// Provides centralized prompt management, versioning, and customization

import { WorkflowType, ReportSection } from '../types/llm.types';
import logger from '../utils/logger';

// Template variable types
export interface TemplateVariables {
  companyName?: string;
  companyNames?: string[];
  industry?: string;
  additionalContext?: Record<string, unknown>;
  previousSections?: Record<string, string>;
  currentDate?: string;
  [key: string]: unknown;
}

// Template metadata
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  workflowType: WorkflowType;
  section: ReportSection;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  tags?: string[];
}

// Full template with content
export interface Template extends TemplateMetadata {
  systemPrompt: string;
  userPrompt: string;
  outputFormat?: string;
  examples?: string[];
}

// Compiled template ready for use
export interface CompiledTemplate {
  systemPrompt: string;
  userPrompt: string;
  metadata: TemplateMetadata;
}

// Default templates for each workflow/section combination
const DEFAULT_TEMPLATES: Record<string, Template> = {
  // Account Intelligence Templates
  'ACCOUNT_INTELLIGENCE:account_overview': {
    id: 'ai-account-overview-v2',
    name: 'Account Overview',
    description: 'Generates comprehensive company overview for account intelligence',
    workflowType: 'ACCOUNT_INTELLIGENCE',
    section: 'account_overview',
    version: '2.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-29'),
    isActive: true,
    tags: ['account', 'overview', 'company', 'iiot'],
    systemPrompt: `You are a senior business intelligence analyst specializing in Industrial Internet of Things (IIoT), operational technology (OT), and enterprise digital infrastructure.

Your role is to produce factual, well-researched intelligence briefings about organizations, including corporations, government agencies, municipalities, and public institutions. These briefings inform strategic decision-making for Cisco account executives focused on industrial and manufacturing sectors.

Guidelines:
- Present facts and analysis objectively - this is an intelligence briefing, not a sales document
- Cite sources when available; clearly distinguish verified data from estimates or projections
- Maintain an executive-briefing tone: professional, concise, and insight-driven
- Focus on IIoT relevance: manufacturing operations, supply chain, industrial automation, smart infrastructure, connected operations, and operational technology
- Avoid product recommendations or sales language`,
    userPrompt: `Generate a comprehensive account overview for {{companyName}}.

Analyze this as whichever entity type applies (corporation, city/municipality, government agency, or other organization).

Include:
1. **Organization Profile**: Entity type, headquarters/location, founding/establishment year, size indicators (employees, population, or budget scale)
2. **Core Function**:
   - For corporations: products/services, target markets, value proposition
   - For government entities: services provided, jurisdiction, key responsibilities
3. **Operational Footprint**: Facilities, infrastructure, geographic scope, or service area
4. **IIoT Context**: How this organization relates to industrial automation, smart infrastructure, connected operations, or OT systems
5. **Leadership**: Key executives or officials, especially those overseeing operations, IT, or digital transformation

{{#if additionalContext}}
Additional context to consider:
{{additionalContext}}
{{/if}}

Format the response as structured markdown with clear headers and bullet points.`,
    outputFormat: 'markdown',
  },

  'ACCOUNT_INTELLIGENCE:financial_health': {
    id: 'ai-financial-health-v2',
    name: 'Financial Health Analysis',
    description: 'Analyzes company financial health and stability',
    workflowType: 'ACCOUNT_INTELLIGENCE',
    section: 'financial_health',
    version: '2.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-29'),
    isActive: true,
    tags: ['financial', 'health', 'analysis'],
    systemPrompt: `You are a financial analyst specializing in enterprise intelligence assessment. Your role is to evaluate the financial health and stability of organizations including corporations, government entities, and municipalities for strategic business intelligence purposes.

Provide balanced, objective analysis based on available public information. When specific data is not available, provide reasonable estimates based on industry benchmarks and organization characteristics. Clearly distinguish verified data from estimates.`,
    userPrompt: `Analyze the financial health of {{companyName}}.

Adapt your analysis based on entity type:
- **Corporations**: Revenue, growth, profitability, credit rating, funding activity
- **Government/Municipalities**: Budget size, fiscal health, bond ratings, tax revenue trends, debt levels

Include:
1. **Financial Overview**: Key financial metrics appropriate to this entity type
2. **Stability Assessment**: Credit/bond rating, debt levels, reserve funds or cash position
3. **Investment Activity**: Recent capital projects, infrastructure investments, or budget allocations
4. **Budget Indicators**: Fiscal year timing, budget cycles, IT/infrastructure spending patterns
5. **Outlook**: Forward guidance, budget projections, or analyst perspectives

{{#if industry}}
Industry/Sector context: {{industry}}
{{/if}}

Provide balanced analysis with specific numbers where available.`,
    outputFormat: 'markdown',
  },

  'ACCOUNT_INTELLIGENCE:security_events': {
    id: 'ai-security-events-v2',
    name: 'Security Events Analysis',
    description: 'Analyzes security posture and relevant events',
    workflowType: 'ACCOUNT_INTELLIGENCE',
    section: 'security_events',
    version: '2.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-29'),
    isActive: true,
    tags: ['security', 'events', 'risk', 'ot', 'iiot'],
    systemPrompt: `You are a cybersecurity analyst specializing in enterprise and industrial security assessment. Your role is to provide factual intelligence about security events, threats, and compliance posture.

Focus on publicly available information and general industry security trends. Avoid speculation about specific vulnerabilities unless publicly disclosed. This is an intelligence briefing, not a security sales document.`,
    userPrompt: `Analyze security-relevant events and posture for {{companyName}}.

Include:
1. **Security Event History**: Publicly known incidents, breaches, or near-misses
2. **Threat Landscape**: Relevant threats affecting this organization type (ransomware targeting government/municipalities, critical infrastructure attacks, manufacturing/OT vulnerabilities, supply chain risks)
3. **Compliance Requirements**: Applicable frameworks based on entity type and geography (NIST, FedRAMP for government; IEC 62443 for industrial; CJIS for law enforcement; SOX for public companies; etc.)
4. **Security Posture Indicators**: Certifications held, public security investments, or stated security priorities

Focus on factual events and contextual analysis. Do not speculate on unreported vulnerabilities.`,
    outputFormat: 'markdown',
  },

  'ACCOUNT_INTELLIGENCE:current_events': {
    id: 'ai-current-events-v2',
    name: 'Current Events & News',
    description: 'Summarizes recent news and events about the company',
    workflowType: 'ACCOUNT_INTELLIGENCE',
    section: 'current_events',
    version: '2.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-29'),
    isActive: true,
    tags: ['news', 'events', 'current'],
    systemPrompt: `You are a business intelligence analyst tracking company news and events. Your role is to provide factual intelligence about recent developments that may indicate strategic direction or operational changes.

Focus on events relevant to industrial operations and technology infrastructure: expansions, mergers, leadership changes, digital transformation initiatives, and technology announcements.`,
    userPrompt: `Compile recent news and developments for {{companyName}}.

Include:
1. **Recent Announcements**: Major news from the past 6 months
2. **Leadership Changes**: New executives or officials, especially CIO/CTO or operations leadership
3. **Expansion Activity**: New facilities, geographic expansion, infrastructure projects, or capacity investments
4. **Technology Initiatives**: Digital transformation projects, smart city initiatives, automation investments, or modernization announcements
5. **Strategic Moves**: For corporations: M&A, partnerships, strategic pivots. For government: policy changes, major contracts, interagency initiatives

Highlight developments most relevant to technology infrastructure and operations.

Current date: {{currentDate}}`,
    outputFormat: 'markdown',
  },

  // Competitive Intelligence Templates
  'COMPETITIVE_INTELLIGENCE:executive_summary': {
    id: 'ci-exec-summary-v1',
    name: 'Executive Summary',
    description: 'High-level competitive intelligence summary',
    workflowType: 'COMPETITIVE_INTELLIGENCE',
    section: 'executive_summary',
    version: '1.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isActive: true,
    tags: ['executive', 'summary', 'competitive'],
    systemPrompt: `You are a competitive intelligence analyst for Cisco Meraki. Your role is to provide concise, actionable competitive analysis that helps sales teams position Meraki solutions against competitors.

Be objective and factual. Acknowledge competitor strengths while highlighting Meraki's differentiation.`,
    userPrompt: `Create an executive summary for competitive intelligence on {{companyName}}.

Provide a 2-3 paragraph summary covering:
- Who they are and their market position
- Their primary threat to Cisco Meraki
- Key battleground areas and recommended response strategies

This summary should give a sales rep quick context before a competitive situation.`,
    outputFormat: 'markdown',
  },

  'COMPETITIVE_INTELLIGENCE:company_overview': {
    id: 'ci-company-overview-v1',
    name: 'Competitor Company Overview',
    description: 'Detailed competitor company profile',
    workflowType: 'COMPETITIVE_INTELLIGENCE',
    section: 'company_overview',
    version: '1.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isActive: true,
    tags: ['competitor', 'overview', 'profile'],
    systemPrompt: `You are a competitive intelligence analyst creating detailed competitor profiles. Focus on information relevant to sales competitive situations.`,
    userPrompt: `Create a detailed company overview for competitor {{companyName}}.

Include:
1. **Company Background**: History, headquarters, ownership, and key facts
2. **Market Position**: Market share, target segments, and geographic focus
3. **Financial Health**: Revenue, growth trends, and investment capacity
4. **Go-to-Market Strategy**: Sales model, channel strategy, and pricing approach
5. **Key Customers**: Notable customer wins and case studies
6. **Recent Developments**: Major announcements, product launches, or strategic shifts`,
    outputFormat: 'markdown',
  },

  'COMPETITIVE_INTELLIGENCE:product_offerings': {
    id: 'ci-products-v1',
    name: 'Product Offerings Analysis',
    description: 'Detailed analysis of competitor products',
    workflowType: 'COMPETITIVE_INTELLIGENCE',
    section: 'product_offerings',
    version: '1.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isActive: true,
    tags: ['products', 'offerings', 'features'],
    systemPrompt: `You are a product analyst specializing in network infrastructure and security solutions. Provide detailed, accurate product comparisons.`,
    userPrompt: `Analyze the product portfolio of {{companyName}}.

For each major product line, include:
1. **Product Categories**: Switches, wireless, security, SD-WAN, etc.
2. **Key Features**: Notable capabilities and differentiators
3. **Target Market**: SMB, mid-market, enterprise, or specific verticals
4. **Management Platform**: Cloud, on-premises, or hybrid management
5. **Licensing Model**: Subscription, perpetual, or hybrid
6. **Integration Capabilities**: APIs, ecosystem partnerships

Compare relevant aspects to Meraki's portfolio where applicable.`,
    outputFormat: 'markdown',
  },

  'COMPETITIVE_INTELLIGENCE:competitive_positioning': {
    id: 'ci-positioning-v1',
    name: 'Competitive Positioning',
    description: 'Analysis of competitive positioning and messaging',
    workflowType: 'COMPETITIVE_INTELLIGENCE',
    section: 'competitive_positioning',
    version: '1.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isActive: true,
    tags: ['positioning', 'messaging', 'competitive'],
    systemPrompt: `You are a competitive positioning expert. Analyze how competitors position themselves and recommend counter-positioning strategies.`,
    userPrompt: `Analyze the competitive positioning of {{companyName}} against Cisco Meraki.

Include:
1. **Their Positioning**: How they position themselves in the market
2. **Key Messages**: Their primary value propositions and talking points
3. **Target Buyer Personas**: Who they're targeting and how
4. **Against Meraki**: How they specifically compete against Meraki
5. **Counter-Positioning**: Recommended responses to their claims
6. **Proof Points**: Evidence to support Meraki's counter-positioning`,
    outputFormat: 'markdown',
  },

  'COMPETITIVE_INTELLIGENCE:strengths_weaknesses': {
    id: 'ci-swot-v1',
    name: 'Strengths & Weaknesses',
    description: 'Competitor SWOT-style analysis',
    workflowType: 'COMPETITIVE_INTELLIGENCE',
    section: 'strengths_weaknesses',
    version: '1.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isActive: true,
    tags: ['swot', 'strengths', 'weaknesses'],
    systemPrompt: `You are a competitive analyst. Provide balanced, objective analysis of competitor strengths and weaknesses.`,
    userPrompt: `Analyze the strengths and weaknesses of {{companyName}}.

**Strengths** (areas where they may have advantage):
- Technology differentiators
- Market positioning advantages
- Customer perception strengths

**Weaknesses** (areas where Meraki can win):
- Technology gaps or limitations
- Market positioning challenges
- Customer perception issues

**Opportunities** (for Meraki to exploit):
- Market trends favoring Meraki
- Competitor missteps or gaps

**Threats** (to watch):
- Areas where competitor is improving
- Market trends favoring competitor

Be specific and actionable for sales teams.`,
    outputFormat: 'markdown',
  },

  'COMPETITIVE_INTELLIGENCE:cisco_analysis': {
    id: 'ci-cisco-analysis-v1',
    name: 'Cisco/Meraki Analysis',
    description: 'How to position Cisco Meraki against this competitor',
    workflowType: 'COMPETITIVE_INTELLIGENCE',
    section: 'cisco_analysis',
    version: '1.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isActive: true,
    tags: ['cisco', 'meraki', 'positioning'],
    systemPrompt: `You are a Cisco Meraki sales strategist. Provide specific guidance on positioning Meraki against competitors.`,
    userPrompt: `Provide Cisco Meraki positioning guidance against {{companyName}}.

Include:
1. **Meraki Differentiators**: Key advantages Meraki has over this competitor
2. **Product Comparisons**: Specific product-to-product advantages
3. **Customer Fit**: Where Meraki is the better choice
4. **Proof Points**: Customer references, case studies, or data points
5. **Objection Handling**: Common objections and responses
6. **Competitive Traps**: Tactics competitors use and how to avoid them`,
    outputFormat: 'markdown',
  },

  'COMPETITIVE_INTELLIGENCE:recommendations': {
    id: 'ci-recommendations-v1',
    name: 'Sales Recommendations',
    description: 'Actionable recommendations for sales teams',
    workflowType: 'COMPETITIVE_INTELLIGENCE',
    section: 'recommendations',
    version: '1.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isActive: true,
    tags: ['recommendations', 'sales', 'strategy'],
    systemPrompt: `You are a sales strategist. Provide practical, actionable recommendations for winning against competitors.`,
    userPrompt: `Provide sales recommendations for competing against {{companyName}}.

**Pre-Sales Strategy**:
- Discovery questions to ask
- Red flags indicating competitor involvement
- Early positioning tactics

**During Evaluation**:
- Demo focus areas
- Proof of concept recommendations
- Technical validation points

**Closing Tactics**:
- Final positioning messages
- Negotiation considerations
- Risk mitigation for customer

**Win/Loss Insights**:
- Common reasons for winning against this competitor
- Common reasons for losing and how to avoid them`,
    outputFormat: 'markdown',
  },

  // News Digest Template
  'NEWS_DIGEST:news_narrative': {
    id: 'nd-narrative-v1',
    name: 'News Digest Narrative',
    description: 'Podcast-style news narrative for multiple companies',
    workflowType: 'NEWS_DIGEST',
    section: 'news_narrative',
    version: '1.0.0',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isActive: true,
    tags: ['news', 'digest', 'narrative', 'podcast'],
    systemPrompt: `You are a technology industry analyst creating engaging news digests. Your style should be professional but conversational, suitable for audio narration or quick reading.

Create content that:
- Is engaging and easy to listen to
- Connects news items into a coherent narrative
- Highlights implications for IT infrastructure and networking
- Maintains objectivity while being insightful`,
    userPrompt: `Create a news digest covering recent developments for these companies: {{companyNames}}.

Structure:
1. **Opening Hook**: Engaging introduction to the digest
2. **Company Updates**: For each company, cover:
   - Most significant recent news
   - Impact on their market position
   - Relevance to networking/IT infrastructure
3. **Industry Trends**: Common themes across the companies
4. **Key Takeaways**: 3-5 bullet points summarizing the most important insights
5. **Closing**: Brief wrap-up suitable for podcast ending

Make the narrative flow naturally as if being read aloud. Use transitions between company segments.

Current date: {{currentDate}}`,
    outputFormat: 'markdown',
  },
};

// Template compilation helper - replaces {{variables}} with values
function compileTemplate(template: string, variables: TemplateVariables): string {
  let compiled = template;

  // Handle conditional blocks {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  compiled = compiled.replace(conditionalRegex, (_match, variable, content) => {
    const value = variables[variable];
    if (value && (typeof value !== 'object' || (Array.isArray(value) && value.length > 0))) {
      return content;
    }
    return '';
  });

  // Handle array iteration {{#each variable}}...{{/each}}
  const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  compiled = compiled.replace(eachRegex, (_match, variable, content) => {
    const arr = variables[variable];
    if (Array.isArray(arr)) {
      return arr.map((item) => content.replace(/\{\{this\}\}/g, String(item))).join('\n');
    }
    return '';
  });

  // Handle simple variable replacement {{variable}}
  const variableRegex = /\{\{(\w+)\}\}/g;
  compiled = compiled.replace(variableRegex, (_match, variable) => {
    const value = variables[variable];
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  });

  return compiled.trim();
}

export class TemplateService {
  private templates: Map<string, Template> = new Map();
  private customTemplates: Map<string, Template> = new Map();

  constructor() {
    // Load default templates
    for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
      this.templates.set(key, template);
    }
    logger.info(`Loaded ${this.templates.size} default templates`);
  }

  // Get template key
  private getTemplateKey(workflowType: WorkflowType, section: ReportSection): string {
    return `${workflowType}:${section}`;
  }

  // Get a template by workflow and section
  getTemplate(workflowType: WorkflowType, section: ReportSection): Template | null {
    const key = this.getTemplateKey(workflowType, section);

    // Check custom templates first
    if (this.customTemplates.has(key)) {
      return this.customTemplates.get(key)!;
    }

    // Fall back to default templates
    return this.templates.get(key) || null;
  }

  // Compile a template with variables
  compileTemplate(
    workflowType: WorkflowType,
    section: ReportSection,
    variables: TemplateVariables
  ): CompiledTemplate | null {
    const template = this.getTemplate(workflowType, section);

    if (!template) {
      logger.warn(`Template not found: ${workflowType}:${section}`);
      return null;
    }

    // Add default variables
    const enrichedVariables: TemplateVariables = {
      ...variables,
      currentDate: variables.currentDate || new Date().toISOString().split('T')[0],
    };

    return {
      systemPrompt: compileTemplate(template.systemPrompt, enrichedVariables),
      userPrompt: compileTemplate(template.userPrompt, enrichedVariables),
      metadata: {
        id: template.id,
        name: template.name,
        description: template.description,
        workflowType: template.workflowType,
        section: template.section,
        version: template.version,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        isActive: template.isActive,
        tags: template.tags,
      },
    };
  }

  // Register a custom template (overrides default)
  registerCustomTemplate(template: Template): void {
    const key = this.getTemplateKey(template.workflowType, template.section);
    this.customTemplates.set(key, template);
    logger.info(`Registered custom template: ${key} (${template.id})`);
  }

  // Remove a custom template (reverts to default)
  removeCustomTemplate(workflowType: WorkflowType, section: ReportSection): boolean {
    const key = this.getTemplateKey(workflowType, section);
    const removed = this.customTemplates.delete(key);
    if (removed) {
      logger.info(`Removed custom template: ${key}`);
    }
    return removed;
  }

  // List all available templates
  listTemplates(workflowType?: WorkflowType): TemplateMetadata[] {
    const templates: TemplateMetadata[] = [];

    for (const [_key, template] of this.templates.entries()) {
      if (!workflowType || template.workflowType === workflowType) {
        templates.push({
          id: template.id,
          name: template.name,
          description: template.description,
          workflowType: template.workflowType,
          section: template.section,
          version: template.version,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          isActive: template.isActive,
          tags: template.tags,
        });
      }
    }

    // Add custom templates (may override defaults in the list)
    for (const [_key, template] of this.customTemplates.entries()) {
      if (!workflowType || template.workflowType === workflowType) {
        const existingIndex = templates.findIndex(
          (t) => t.workflowType === template.workflowType && t.section === template.section
        );

        const metadata: TemplateMetadata = {
          id: template.id,
          name: template.name,
          description: template.description,
          workflowType: template.workflowType,
          section: template.section,
          version: template.version,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          isActive: template.isActive,
          tags: template.tags,
        };

        if (existingIndex >= 0) {
          templates[existingIndex] = metadata;
        } else {
          templates.push(metadata);
        }
      }
    }

    return templates;
  }

  // Get sections for a workflow type
  getSectionsForWorkflow(workflowType: WorkflowType): ReportSection[] {
    const sections: ReportSection[] = [];

    for (const [_key, template] of this.templates.entries()) {
      if (template.workflowType === workflowType && !sections.includes(template.section)) {
        sections.push(template.section);
      }
    }

    return sections;
  }

  // Validate a template
  validateTemplate(template: Partial<Template>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.workflowType) errors.push('Workflow type is required');
    if (!template.section) errors.push('Section is required');
    if (!template.systemPrompt) errors.push('System prompt is required');
    if (!template.userPrompt) errors.push('User prompt is required');

    // Validate workflow type
    const validWorkflowTypes: WorkflowType[] = ['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST'];
    if (template.workflowType && !validWorkflowTypes.includes(template.workflowType)) {
      errors.push(`Invalid workflow type: ${template.workflowType}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
let templateServiceInstance: TemplateService | null = null;

export function getTemplateService(): TemplateService {
  if (!templateServiceInstance) {
    templateServiceInstance = new TemplateService();
  }
  return templateServiceInstance;
}

export default TemplateService;

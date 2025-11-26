# IIoT Account Intelligence - Technical Specifications

## Table of Contents

1. [Workflow Specifications](#1-workflow-specifications)
2. [LLM Integration Details](#2-llm-integration-details)
3. [Report Generation Specifications](#3-report-generation-specifications)
4. [Security Implementation](#4-security-implementation)
5. [API Specifications](#5-api-specifications)
6. [UI/UX Specifications](#6-uiux-specifications)
7. [Performance Requirements](#7-performance-requirements)

---

## 1. Workflow Specifications

### 1.1 Account Intelligence Workflow

**Purpose**: Generate comprehensive intelligence reports about customer accounts with customizable sections.

**User Flow:**
```
1. User navigates to Account Intelligence
2. User inputs account data:
   - Option A: Single account name (text input)
   - Option B: Bulk paste (textarea with multiple accounts)
   - Option C: CSV upload (file upload)
3. System validates and enriches account data via LLM
4. User selects report sections:
   [ ] Account Overview
   [ ] Financial Health
   [ ] Security Events
   [ ] Current Events
   [ ] Market Position
   [ ] Key Contacts
5. User selects output format (PDF/Word)
6. User clicks "Generate Report"
7. System shows progress (enriching data, generating sections, formatting)
8. Report completes - user can download or send via Webex
9. Report saved to history
```

**Report Sections Detailed:**

**Account Overview:**
- Company description and industry
- Size (employees, revenue estimates)
- Headquarters and locations
- Leadership team
- Recent company milestones
- Strategic focus areas

**Financial Health:**
- Financial standing (public companies: actual data, private: estimates)
- Revenue trends
- Profitability indicators
- Credit rating (if available)
- Recent funding/acquisitions
- Financial outlook

**Security Events:**
- Recent security incidents
- Data breaches
- Regulatory compliance issues
- Cybersecurity posture (if public)
- Industry-specific security concerns

**Current Events:**
- Recent news (last 30-90 days)
- Press releases
- Product launches
- Partnership announcements
- Industry recognition/awards
- Challenges and controversies

**LLM Prompts:**

```typescript
const ACCOUNT_OVERVIEW_PROMPT = `
You are a business intelligence analyst. Provide a comprehensive overview of the following company: {companyName}

Include:
1. Company description and primary business
2. Industry and market segment
3. Company size (employees, revenue if available)
4. Headquarters location and major offices
5. Key leadership (CEO, other C-level executives)
6. Recent major milestones or achievements
7. Strategic focus areas and initiatives

Format the response in a professional, concise manner suitable for an executive briefing.
Focus on facts and cite sources where possible.
If information is not available, indicate this clearly rather than speculating.
`;

const FINANCIAL_HEALTH_PROMPT = `
You are a financial analyst. Analyze the financial health of: {companyName}

Provide:
1. Overall financial standing and stability
2. Revenue trends (last 2-3 years if available)
3. Profitability indicators
4. Credit rating or financial health indicators
5. Recent funding rounds, acquisitions, or financial events
6. Financial outlook and analyst perspectives

For private companies, provide estimates and industry context.
Clearly distinguish between verified data and estimates.
Use professional financial terminology but keep it accessible.
`;

const SECURITY_EVENTS_PROMPT = `
You are a cybersecurity analyst. Research security-related events for: {companyName}

Search for and summarize:
1. Data breaches or security incidents (last 2 years)
2. Regulatory compliance issues or penalties
3. Known cybersecurity posture or certifications
4. Industry-specific security challenges
5. Security partnerships or investments
6. Any ongoing security concerns

If no significant events found, provide context on industry security landscape.
Cite sources and dates for all incidents.
Maintain objectivity and factual reporting.
`;

const CURRENT_EVENTS_PROMPT = `
You are a news analyst. Summarize recent events and news for: {companyName}

Cover the last 30-90 days:
1. Major news headlines
2. Product or service launches
3. Partnership announcements
4. Industry recognition or awards
5. Expansion or restructuring
6. Any challenges or controversies

Present in chronological order, most recent first.
Cite sources and dates.
Focus on significant, business-relevant news.
`;
```

### 1.2 Competitive Intelligence Workflow

**Purpose**: Analyze competitors from the perspective of Cisco IIoT portfolio positioning.

**User Flow:**
```
1. User navigates to Competitive Intelligence
2. User inputs target company name
3. User selects focus areas (optional):
   - Manufacturing
   - Energy & Utilities
   - Transportation
   - Smart Cities
   - Oil & Gas
4. User can specify Cisco IIoT products of interest (optional)
5. User selects output format (PDF/Word)
6. User clicks "Generate Analysis"
7. System generates competitive analysis via LLM
8. Report completes with download/Webex delivery options
```

**Report Sections:**
- Executive Summary
- Company Overview
- Market Position
- Product/Service Offerings
- Technology Stack and Capabilities
- Strengths and Weaknesses
- Cisco IIoT Competitive Analysis
  - Where Cisco excels
  - Competitive advantages
  - Areas for improvement
  - Win strategies
- Recommendations

**LLM Prompt:**

```typescript
const COMPETITIVE_INTELLIGENCE_PROMPT = `
You are a competitive intelligence analyst specializing in Industrial IoT (IIoT) solutions.

Analyze: {targetCompany}
Focus Areas: {focusAreas}
Cisco IIoT Products: {ciscoProducts}

Provide a comprehensive competitive analysis including:

1. EXECUTIVE SUMMARY
   - Key findings and strategic implications

2. COMPANY OVERVIEW
   - Business focus and market position
   - Target industries and customers
   - Company size and reach

3. PRODUCT/SERVICE OFFERINGS
   - Core IIoT products and solutions
   - Technology stack and platforms
   - Integration capabilities
   - Pricing model (if known)

4. COMPETITIVE POSITIONING
   - Market share and presence
   - Key differentiators
   - Notable customers and case studies
   - Recent wins or losses

5. STRENGTHS
   - What they do well
   - Competitive advantages
   - Innovation areas

6. WEAKNESSES
   - Gaps in offerings
   - Known challenges
   - Areas where competitors excel

7. CISCO IIoT COMPETITIVE ANALYSIS
   Compare against Cisco's IIoT portfolio (Industrial Networking, Edge Computing, Security, IoT Operations):
   - Areas where Cisco has clear advantages
   - Areas where {targetCompany} is stronger
   - Differentiation opportunities
   - Competitive win strategies

8. RECOMMENDATIONS
   - How to position Cisco against {targetCompany}
   - Key talking points
   - Customer considerations

Format professionally for executive review.
Use specific examples and data where possible.
Be objective and balanced in the analysis.
`;
```

### 1.3 News Digest Workflow

**Purpose**: Create a one-page narrative digest of recent news across multiple customer accounts.

**User Flow:**
```
1. User navigates to News Digest
2. User inputs multiple account names:
   - Bulk paste (comma or line separated)
   - CSV upload with account names
3. User optionally sets date range (default: last 30 days)
4. User selects output format (PDF/Word)
5. User clicks "Generate Digest"
6. System gathers news for all accounts
7. System creates narrative-style digest
8. Report completes with download/Webex delivery options
```

**Report Format:**
- Header with date range
- Narrative-style content organized by theme or by company
- One-page limit (concise summaries)
- Hyperlinks to sources
- Professional news article format

**LLM Prompt:**

```typescript
const NEWS_DIGEST_PROMPT = `
You are a business news editor creating a concise executive news digest.

Accounts: {accountList}
Date Range: {startDate} to {endDate}

Create a one-page news digest in the style of a professional news brief:

1. Write a compelling headline that captures the main themes
2. Organize news by either:
   - Thematic approach (group related news across companies)
   - Company-by-company approach (separate section per company)
   Choose the approach that tells the most coherent story.

3. For each news item:
   - Write in narrative, journalistic style
   - Include company name in context
   - Summarize key points concisely
   - Focus on business impact and significance
   - Include dates

4. Keep total length to approximately 500-700 words (one page)
5. Conclude with a brief "Looking Ahead" section if relevant trends emerged

Style Guidelines:
- Professional, objective tone
- Active voice
- Clear, concise sentences
- No bullet points - narrative paragraphs only
- Assume executive audience

If limited news is available for some companies, focus on those with significant events.
`;
```

---

## 2. LLM Integration Details

### 2.1 LLM Service Architecture

**Abstraction Layer Design:**

```typescript
// types/llm.types.ts
export interface LLMProvider {
  name: 'openai' | 'xai';
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  checkHealth(): Promise<boolean>;
}

export interface CompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

// services/llm.service.ts
export class LLMService {
  private providers: Map<string, LLMProvider>;
  private defaultProvider: string;

  constructor() {
    this.providers = new Map();
    this.registerProviders();
  }

  private registerProviders() {
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('xai', new XAIProvider());
  }

  async generateCompletion(
    request: CompletionRequest,
    providerName?: string
  ): Promise<CompletionResponse> {
    const provider = this.getProvider(providerName);

    try {
      return await this.executeWithRetry(provider, request);
    } catch (error) {
      // Fallback to alternative provider
      return await this.fallback(request, providerName);
    }
  }

  private async executeWithRetry(
    provider: LLMProvider,
    request: CompletionRequest,
    maxRetries = 3
  ): Promise<CompletionResponse> {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.generateCompletion(request);
      } catch (error) {
        lastError = error;
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }

    throw lastError;
  }

  private async fallback(
    request: CompletionRequest,
    failedProvider?: string
  ): Promise<CompletionResponse> {
    // Try alternative provider
    const alternativeProvider = failedProvider === 'openai' ? 'xai' : 'openai';
    const provider = this.getProvider(alternativeProvider);

    return await provider.generateCompletion(request);
  }

  private getProvider(name?: string): LLMProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    return provider;
  }
}
```

### 2.2 OpenAI Provider Implementation

```typescript
// services/llm/openai.provider.ts
import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  name = 'openai' as const;
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    this.client = new OpenAI({ apiKey });
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = request.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    if (request.systemPrompt) {
      messages.unshift({
        role: 'system',
        content: request.systemPrompt
      });
    }

    const completion = await this.client.chat.completions.create({
      model: request.model || 'gpt-4',
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4000,
    });

    return {
      content: completion.choices[0].message.content || '',
      model: completion.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
      finishReason: completion.choices[0].finish_reason,
    };
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.client.models.retrieve('gpt-4');
      return true;
    } catch {
      return false;
    }
  }
}
```

### 2.3 X.ai Provider Implementation

```typescript
// services/llm/xai.provider.ts
import axios from 'axios';

export class XAIProvider implements LLMProvider {
  name = 'xai' as const;
  private apiKey: string;
  private baseURL = 'https://api.x.ai/v1';

  constructor() {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error('X.ai API key not configured');
    }

    this.apiKey = apiKey;
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const messages = [...request.messages];

    if (request.systemPrompt) {
      messages.unshift({
        role: 'system',
        content: request.systemPrompt
      });
    }

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: request.model || 'grok-2-latest',
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const completion = response.data;

    return {
      content: completion.choices[0].message.content || '',
      model: completion.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
      finishReason: completion.choices[0].finish_reason,
    };
  }

  async checkHealth(): Promise<boolean> {
    try {
      await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

### 2.4 Data Enrichment Service

```typescript
// services/enrichment.service.ts
export class EnrichmentService {
  constructor(private llmService: LLMService) {}

  async enrichSingleAccount(accountName: string): Promise<EnrichedAccount> {
    const prompt = `
You are a data validation and enrichment assistant.

Task: Validate and enrich the following company name: "${accountName}"

Provide a JSON response with:
{
  "validated": true/false,
  "officialName": "Official company name",
  "alternateNames": ["List", "of", "alternate", "names"],
  "industry": "Primary industry",
  "website": "Company website if known",
  "confidence": 0.0-1.0
}

If the company name is ambiguous or unclear, set validated to false and provide suggestions.
    `;

    const response = await this.llmService.generateCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Low temperature for factual data
    });

    return JSON.parse(response.content);
  }

  async enrichBulkAccounts(accountNames: string[]): Promise<EnrichedAccount[]> {
    // Process in batches to avoid rate limits
    const batchSize = 5;
    const results: EnrichedAccount[] = [];

    for (let i = 0; i < accountNames.length; i += batchSize) {
      const batch = accountNames.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(name => this.enrichSingleAccount(name))
      );
      results.push(...batchResults);
    }

    return results;
  }

  async parseCSVAndEnrich(csvContent: string): Promise<EnrichedAccount[]> {
    const prompt = `
You are a data extraction assistant.

Task: Extract company names from the following CSV content:
${csvContent}

Respond with a JSON array of company names:
["Company 1", "Company 2", ...]

Extract only the company names, removing any extraneous data.
    `;

    const response = await this.llmService.generateCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const companyNames: string[] = JSON.parse(response.content);
    return await this.enrichBulkAccounts(companyNames);
  }
}

interface EnrichedAccount {
  validated: boolean;
  officialName: string;
  alternateNames: string[];
  industry: string;
  website?: string;
  confidence: number;
}
```

---

## 3. Report Generation Specifications

### 3.1 Report Template System

**Template Structure:**

```typescript
// types/report.types.ts
export interface ReportTemplate {
  header: HeaderTemplate;
  sections: SectionTemplate[];
  footer: FooterTemplate;
  styles: ReportStyles;
}

export interface HeaderTemplate {
  logo?: string;
  title: string;
  subtitle?: string;
  metadata: {
    generatedDate: boolean;
    generatedBy: boolean;
    reportType: boolean;
  };
}

export interface SectionTemplate {
  type: 'text' | 'table' | 'chart' | 'image';
  title: string;
  content: any;
  style?: string;
}

export interface ReportStyles {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: {
    title: number;
    heading: number;
    body: number;
  };
}
```

**HTML Template (Handlebars):**

```handlebars
<!-- templates/report-base.hbs -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    @page {
      margin: 1in;
      @top-right {
        content: "Page " counter(page) " of " counter(pages);
      }
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }

    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #0066cc;
      margin-bottom: 30px;
    }

    .header h1 {
      color: #0066cc;
      font-size: 24pt;
      margin: 10px 0;
    }

    .header .subtitle {
      color: #666;
      font-size: 12pt;
    }

    .metadata {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 9pt;
      color: #666;
      border-bottom: 1px solid #ddd;
      margin-bottom: 20px;
    }

    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .section-title {
      color: #0066cc;
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #0066cc;
    }

    .section-content {
      margin-top: 15px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }

    table th {
      background-color: #0066cc;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: bold;
    }

    table td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }

    table tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }

    a {
      color: #0066cc;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .highlight {
      background-color: #fff3cd;
      padding: 2px 5px;
      border-radius: 3px;
    }

    .warning {
      background-color: #f8d7da;
      border-left: 4px solid #dc3545;
      padding: 10px;
      margin: 10px 0;
    }

    .info {
      background-color: #d1ecf1;
      border-left: 4px solid #0c5460;
      padding: 10px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    {{#if logo}}
      <img src="{{logo}}" alt="Logo" style="max-height: 60px;">
    {{/if}}
    <h1>{{title}}</h1>
    {{#if subtitle}}
      <div class="subtitle">{{subtitle}}</div>
    {{/if}}
  </div>

  <div class="metadata">
    <div>Report Type: {{reportType}}</div>
    <div>Generated: {{generatedDate}}</div>
    <div>Generated By: {{generatedBy}}</div>
  </div>

  {{#each sections}}
    <div class="section">
      <h2 class="section-title">{{this.title}}</h2>
      <div class="section-content">
        {{{this.content}}}
      </div>
    </div>
  {{/each}}

  <div class="footer">
    <p>Generated by IIoT Account Intelligence Platform</p>
    <p>Confidential - For Internal Use Only</p>
  </div>
</body>
</html>
```

### 3.2 PDF Generation Service

```typescript
// services/document.service.ts
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

export class DocumentService {
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  async generatePDF(reportData: ReportData): Promise<string> {
    // Compile template
    const template = await this.getTemplate('report-base');
    const html = template(reportData);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          right: '0.75in',
          bottom: '1in',
          left: '0.75in',
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 9px; text-align: center; width: 100%; color: #666;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `,
      });

      // Save to file
      const fileName = `report-${reportData.id}-${Date.now()}.pdf`;
      const filePath = path.join(process.env.STORAGE_PATH!, fileName);
      await fs.writeFile(filePath, pdfBuffer);

      return filePath;
    } finally {
      await browser.close();
    }
  }

  private async getTemplate(name: string): Promise<HandlebarsTemplateDelegate> {
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name)!;
    }

    const templatePath = path.join(__dirname, '../templates', `${name}.hbs`);
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);

    this.templateCache.set(name, template);
    return template;
  }
}
```

### 3.3 Word Document Generation Service

```typescript
// services/document.service.ts (continued)
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Packer,
} from 'docx';

export class DocumentService {
  // ... (previous PDF methods)

  async generateWord(reportData: ReportData): Promise<string> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: reportData.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          new Paragraph({
            text: reportData.subtitle || '',
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          // Metadata
          new Paragraph({
            children: [
              new TextRun({
                text: `Report Type: ${reportData.reportType}  |  `,
                size: 18,
              }),
              new TextRun({
                text: `Generated: ${reportData.generatedDate}  |  `,
                size: 18,
              }),
              new TextRun({
                text: `By: ${reportData.generatedBy}`,
                size: 18,
              }),
            ],
            spacing: { after: 400 },
            border: {
              bottom: {
                color: '0066CC',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          }),

          // Sections
          ...this.generateWordSections(reportData.sections),

          // Footer
          new Paragraph({
            text: 'Generated by IIoT Account Intelligence Platform',
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
          }),
          new Paragraph({
            text: 'Confidential - For Internal Use Only',
            alignment: AlignmentType.CENTER,
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    // Save to file
    const fileName = `report-${reportData.id}-${Date.now()}.docx`;
    const filePath = path.join(process.env.STORAGE_PATH!, fileName);
    await fs.writeFile(filePath, buffer);

    return filePath;
  }

  private generateWordSections(sections: ReportSection[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    for (const section of sections) {
      // Section title
      paragraphs.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      // Section content
      if (typeof section.content === 'string') {
        // Split by paragraphs
        const contentParagraphs = section.content.split('\n\n');
        for (const para of contentParagraphs) {
          paragraphs.push(
            new Paragraph({
              text: para,
              spacing: { after: 200 },
            })
          );
        }
      }
    }

    return paragraphs;
  }
}
```

---

## 4. Security Implementation

### 4.1 Authentication Middleware

```typescript
// middleware/auth.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
  };
}

export async function authMiddleware(
  request: AuthRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: 'ADMIN' | 'USER';
    };

    // Attach user to request
    request.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
}

export async function adminMiddleware(
  request: AuthRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.user?.role !== 'ADMIN') {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
  }
}
```

### 4.2 API Key Encryption

```typescript
// utils/crypto.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

export class CryptoService {
  private masterKey: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    this.masterKey = Buffer.from(secret, 'hex');
  }

  encrypt(text: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(this.masterKey, salt, 100000, KEY_LENGTH, 'sha512');
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted
    return Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex'),
    ]).toString('base64');
  }

  decrypt(encryptedData: string): string {
    const buffer = Buffer.from(encryptedData, 'base64');

    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = crypto.pbkdf2Sync(this.masterKey, salt, 100000, KEY_LENGTH, 'sha512');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }
}
```

### 4.3 Rate Limiting

```typescript
// middleware/rate-limit.middleware.ts
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';

export function setupRateLimiting(app: FastifyInstance) {
  // General API rate limiting
  app.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    cache: 10000,
    allowList: ['127.0.0.1'],
    redis: process.env.REDIS_URL ? require('ioredis')(process.env.REDIS_URL) : undefined,
  });

  // Stricter limits for auth endpoints
  app.register(rateLimit, {
    max: 5,
    timeWindow: '15 minutes',
    prefix: '/api/auth/',
  });

  // Report generation limits
  app.register(rateLimit, {
    max: 10,
    timeWindow: '1 hour',
    prefix: '/api/reports',
    keyGenerator: (request) => {
      // Rate limit per user, not per IP
      return (request as any).user?.id || request.ip;
    },
  });
}
```

---

## 5. API Specifications

### 5.1 Request/Response Examples

**Create Account Intelligence Report:**

```http
POST /api/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "workflowType": "ACCOUNT_INTELLIGENCE",
  "configuration": {
    "sections": {
      "accountOverview": true,
      "financialHealth": true,
      "securityEvents": true,
      "currentEvents": true
    }
  },
  "inputData": {
    "accounts": [
      { "name": "Tesla Inc" },
      { "name": "Ford Motor Company" }
    ]
  },
  "format": ["PDF", "DOCX"]
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Account Intelligence Report",
    "status": "PENDING",
    "createdAt": "2025-11-24T10:00:00Z"
  }
}
```

**Get Report Status:**

```http
GET /api/reports/{id}
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Account Intelligence Report",
    "workflowType": "ACCOUNT_INTELLIGENCE",
    "status": "COMPLETED",
    "format": ["PDF", "DOCX"],
    "filePaths": {
      "PDF": "/storage/reports/report-uuid-123.pdf",
      "DOCX": "/storage/reports/report-uuid-123.docx"
    },
    "createdAt": "2025-11-24T10:00:00Z",
    "completedAt": "2025-11-24T10:05:30Z"
  }
}
```

**Download Report:**

```http
GET /api/reports/{id}/download?format=PDF
Authorization: Bearer <token>

Response 200:
Content-Type: application/pdf
Content-Disposition: attachment; filename="account-intelligence-20251124.pdf"

<binary PDF data>
```

### 5.2 Error Codes

```typescript
export enum ErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  FORBIDDEN = 'FORBIDDEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // Report Generation
  GENERATION_FAILED = 'GENERATION_FAILED',
  LLM_ERROR = 'LLM_ERROR',
  ENRICHMENT_FAILED = 'ENRICHMENT_FAILED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

---

## 6. UI/UX Specifications

### 6.1 Design System

**Color Palette:**
```css
:root {
  /* Primary */
  --primary-50: #e3f2fd;
  --primary-100: #bbdefb;
  --primary-500: #2196f3;
  --primary-600: #1976d2;
  --primary-700: #1565c0;

  /* Secondary */
  --secondary-500: #ff9800;
  --secondary-600: #f57c00;

  /* Neutral */
  --gray-50: #fafafa;
  --gray-100: #f5f5f5;
  --gray-200: #eeeeee;
  --gray-300: #e0e0e0;
  --gray-500: #9e9e9e;
  --gray-700: #616161;
  --gray-900: #212121;

  /* Semantic */
  --success: #4caf50;
  --warning: #ff9800;
  --error: #f44336;
  --info: #2196f3;
}
```

**Typography:**
```css
:root {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
}
```

### 6.2 Key UI Components

**Report Configuration Card:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Account Intelligence Report</CardTitle>
    <CardDescription>Generate comprehensive account analysis</CardDescription>
  </CardHeader>
  <CardContent>
    <Form>
      {/* Account input */}
      {/* Section selection */}
      {/* Format selection */}
    </Form>
  </CardContent>
  <CardFooter>
    <Button type="submit">Generate Report</Button>
  </CardFooter>
</Card>
```

**Progress Indicator:**
```tsx
<div className="progress-container">
  <Progress value={progress} className="w-full" />
  <div className="progress-steps">
    <Step completed={step >= 1}>Enriching Data</Step>
    <Step completed={step >= 2}>Generating Content</Step>
    <Step completed={step >= 3}>Formatting Report</Step>
    <Step completed={step >= 4}>Complete</Step>
  </div>
</div>
```

---

## 7. Performance Requirements

### 7.1 Response Time Targets

| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| Page Load (First Contentful Paint) | < 1.5s | 3s |
| API Response (Simple) | < 200ms | 500ms |
| API Response (Complex) | < 1s | 2s |
| Report Generation | < 2 min | 5 min |
| Database Query | < 100ms | 300ms |
| LLM API Call | < 10s | 30s |

### 7.2 Scalability Targets

- **Concurrent Users**: 50-100 simultaneously
- **Daily Reports**: 500-1000 reports
- **Database Size**: Support up to 100GB
- **File Storage**: Support up to 1TB
- **API Throughput**: 1000 requests/minute

### 7.3 Optimization Strategies

**Frontend:**
- Code splitting per route
- Image lazy loading
- Virtual scrolling for long lists
- Debounced search inputs
- Optimistic UI updates

**Backend:**
- Database connection pooling
- Redis caching for frequently accessed data
- LLM response caching (where appropriate)
- Background job processing
- Streaming for large files

**Database:**
- Proper indexing strategy
- Query optimization
- Pagination for large result sets
- Archival of old data

---

**Document Version**: 1.0
**Last Updated**: 2025-11-24

# Virtual Podcast Feature - Technical Design Document

## Executive Summary

This document outlines the design and implementation plan for adding a **Virtual Podcast** delivery option to the IIoT Account Intelligence platform. This feature will transform report content into engaging, multi-person conversational audio discussions, making insights more accessible and consumable.

---

## 1. Architecture Evaluation

### 1.1 Current Architecture Strengths

**Well-Suited for Podcast Feature:**

1. **LLM Integration Layer**: Already abstracts OpenAI and X.ai APIs
   - Easy to add new LLM capabilities (dialogue generation)
   - Supports multiple providers for redundancy

2. **Report Generation Pipeline**: Modular design
   - Content already structured by sections
   - Easy to inject podcast generation as additional step
   - Existing format selection (PDF, DOCX) can extend to PODCAST

3. **File Storage System**: In place for documents
   - Can be extended for audio files
   - Already handles large file storage

4. **Delivery Infrastructure**: Flexible
   - Download mechanism exists
   - Webex bot can share audio links
   - Easy to add streaming endpoint

5. **Background Job System**: Ready for async processing
   - Podcast generation will be time-intensive
   - Can leverage existing job queue architecture

### 1.2 Required Enhancements

**New Components Needed:**

1. **Dialogue Generation Service**: LLM-powered script creation
2. **Text-to-Speech Service**: Convert script to audio
3. **Audio Processing Service**: Mix voices, add music/effects
4. **Streaming Service**: Serve audio files
5. **Podcast Templates**: Define conversation styles

---

## 2. Virtual Podcast Feature Overview

### 2.1 Concept

Transform report content into a dynamic, multi-person podcast discussion featuring:

- **2-4 virtual hosts** with distinct personalities and voices
- **Natural conversation flow** with questions, insights, and analysis
- **Different formats** based on report type:
  - **Account Intelligence**: Deep dive interview style
  - **Competitive Intelligence**: Debate/analysis format
  - **News Digest**: News roundtable discussion
- **Professional quality audio** with intro/outro music
- **Customizable length**: 5-minute summary to 20-minute deep dive

### 2.2 User Experience

**Report Generation Flow:**
```
1. User creates report with standard configuration
2. User selects delivery formats:
   ☐ PDF
   ☐ Word
   ☑ Virtual Podcast
3. User selects podcast style:
   - Quick Summary (5 min)
   - Standard Discussion (10-15 min)
   - Deep Dive (15-20 min)
4. System generates report content
5. System generates podcast script
6. System converts script to audio
7. User receives download link or Webex delivery
```

**Listening Experience:**
- Stream directly from web app
- Download MP3 file
- Receive via Webex bot with audio player
- Subscribe via RSS feed (future)

---

## 3. Technical Architecture

### 3.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Report Generation                         │
│                                                              │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│  │ Account    │   │Competitive │   │   News     │         │
│  │Intelligence│   │Intelligence│   │   Digest   │         │
│  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘         │
│        │                 │                 │                 │
│        └─────────────────┴─────────────────┘                │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PODCAST GENERATION PIPELINE                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Script Generation Service                        │   │
│  │    - Analyze report content                         │   │
│  │    - Generate multi-person dialogue                 │   │
│  │    - Apply conversation template                    │   │
│  │    - LLM: GPT-4 or similar                         │   │
│  └─────────────┬───────────────────────────────────────┘   │
│                │                                             │
│                ▼                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 2. Voice Assignment & TTS Service                   │   │
│  │    - Assign voices to characters                    │   │
│  │    - Convert text to speech                         │   │
│  │    - Options:                                       │   │
│  │      • OpenAI TTS API (Alloy, Echo, Fable, etc.)   │   │
│  │      • ElevenLabs (premium quality)                 │   │
│  │      • Azure Cognitive Services                     │   │
│  └─────────────┬───────────────────────────────────────┘   │
│                │                                             │
│                ▼                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 3. Audio Processing Service                         │   │
│  │    - Mix multiple voice tracks                      │   │
│  │    - Add background music                           │   │
│  │    - Add intro/outro                                │   │
│  │    - Normalize audio levels                         │   │
│  │    - Export to MP3                                  │   │
│  │    - Tools: FFmpeg, Web Audio API                  │   │
│  └─────────────┬───────────────────────────────────────┘   │
│                │                                             │
└────────────────┼─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Storage & Delivery                        │
│                                                              │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│  │   File     │   │  Streaming │   │   Webex    │         │
│  │  Storage   │   │  Endpoint  │   │  Delivery  │         │
│  └────────────┘   └────────────┘   └────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
User Request → Report Generation → Content Analysis
                                         ↓
                              Script Generation (LLM)
                                         ↓
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
            Voice 1 TTS                              Voice 2+ TTS
                    │                                         │
                    └────────────────┬────────────────────────┘
                                     ↓
                            Audio Mixing & Processing
                                     ↓
                            MP3 File Generation
                                     ↓
                              Storage & CDN
                                     ↓
                    ┌────────────────┴────────────────────┐
                    ▼                                     ▼
              User Download                        Webex Delivery
```

---

## 4. Script Generation System

### 4.1 Conversation Templates

**Template Structure:**
```typescript
interface PodcastTemplate {
  name: string;
  duration: 'short' | 'standard' | 'long'; // 5min, 10-15min, 15-20min
  format: 'interview' | 'roundtable' | 'debate' | 'news';
  hosts: PodcastHost[];
  segments: PodcastSegment[];
}

interface PodcastHost {
  id: string;
  name: string;
  role: 'host' | 'analyst' | 'expert' | 'correspondent';
  personality: string; // 'analytical', 'enthusiastic', 'skeptical', 'neutral'
  voiceId: string; // TTS voice identifier
}

interface PodcastSegment {
  type: 'intro' | 'content' | 'analysis' | 'outro';
  duration: number; // seconds
  speakers: string[]; // host IDs
}
```

**Example Templates:**

**1. Account Intelligence - Deep Dive Interview**
```yaml
Template: "Executive Brief"
Duration: 10-15 minutes
Hosts:
  - Host (Sarah): Experienced interviewer, analytical
  - Analyst (Marcus): Industry expert, enthusiastic
  - Researcher (Alex): Data-focused, methodical

Segments:
  1. Intro (30s)
     - Sarah introduces the company
     - Sets context for discussion

  2. Company Overview (3min)
     - Marcus presents company background
     - Sarah asks clarifying questions
     - Alex adds market position data

  3. Financial Analysis (3min)
     - Alex presents financial health
     - Marcus provides industry context
     - Sarah highlights key metrics

  4. Security & News (2-3min)
     - Alex reports security events
     - Sarah discusses current events
     - Marcus analyzes implications

  5. Key Takeaways (1-2min)
     - Each host shares one key insight
     - Sarah summarizes action items

  6. Outro (30s)
     - Thank listeners
     - Prompt for next steps
```

**2. Competitive Intelligence - Strategic Debate**
```yaml
Template: "Market Analysis"
Duration: 10-15 minutes
Hosts:
  - Moderator (Jordan): Neutral, guides discussion
  - Strategist (Morgan): Cisco advocate, strategic
  - Market Analyst (Taylor): Independent, critical

Segments:
  1. Intro (30s)
     - Jordan sets up competitive landscape

  2. Competitor Overview (3min)
     - Taylor presents competitor profile
     - Morgan adds Cisco context

  3. Head-to-Head Analysis (4-5min)
     - Morgan argues Cisco strengths
     - Taylor provides balanced view
     - Jordan highlights key differences

  4. Win Strategies (2-3min)
     - Morgan proposes Cisco positioning
     - Taylor evaluates feasibility
     - Jordan synthesizes recommendations

  5. Outro (30s)
```

**3. News Digest - Roundtable**
```yaml
Template: "Industry Pulse"
Duration: 5-10 minutes
Hosts:
  - Anchor (Riley): News presenter, concise
  - Reporter 1 (Casey): Covers specific accounts
  - Reporter 2 (Drew): Covers specific accounts

Segments:
  1. Intro (15s)
     - Riley opens with overview

  2. News Items (4-8min)
     - For each account:
       - Reporter presents key news
       - Riley adds context
       - Quick analysis

  3. Week Ahead (1min)
     - Riley highlights trends
     - Reporters preview upcoming events

  4. Outro (15s)
```

### 4.2 Script Generation Process

**LLM Prompt Engineering:**

```typescript
const PODCAST_SCRIPT_PROMPT = `
You are an expert podcast script writer. Generate a natural, engaging conversation between multiple hosts discussing business intelligence.

Context:
- Report Type: {reportType}
- Content: {reportContent}
- Template: {templateName}
- Duration Target: {durationMinutes} minutes
- Hosts: {hostDescriptions}

Instructions:
1. Create natural dialogue that sounds like real people talking
2. Include transitions, reactions, and conversational elements
3. Break down complex information into digestible points
4. Add personality appropriate to each host
5. Include verbal cues (pauses, emphasis, questions)
6. Make it engaging and informative, not robotic
7. Target word count: approximately {targetWordCount} words

Format:
Return a JSON structure with:
{
  "title": "Podcast episode title",
  "description": "Brief description",
  "duration_estimate": "X minutes",
  "segments": [
    {
      "type": "intro|content|outro",
      "dialogue": [
        {
          "speaker": "host_id",
          "text": "Spoken text...",
          "notes": "tone: enthusiastic, pace: normal"
        }
      ]
    }
  ],
  "music_cues": {
    "intro": "upbeat_corporate",
    "outro": "closing_theme"
  }
}

Report Content:
{fullReportContent}
`;
```

**Example Generated Script:**

```json
{
  "title": "Tesla Inc. - Account Intelligence Deep Dive",
  "description": "An in-depth analysis of Tesla's business position, financial health, and recent developments",
  "duration_estimate": "12 minutes",
  "segments": [
    {
      "type": "intro",
      "dialogue": [
        {
          "speaker": "sarah",
          "text": "Welcome to IIoT Intelligence Brief. I'm Sarah, and today we're diving deep into Tesla Incorporated. Joining me are Marcus, our industry analyst, and Alex, our research specialist.",
          "notes": "tone: professional, pace: moderate"
        },
        {
          "speaker": "marcus",
          "text": "Thanks Sarah! Really excited to discuss Tesla. They've been making some interesting moves lately.",
          "notes": "tone: enthusiastic, pace: energetic"
        },
        {
          "speaker": "alex",
          "text": "Absolutely. I've been tracking their latest financials and there's a lot to unpack here.",
          "notes": "tone: analytical, pace: measured"
        }
      ]
    },
    {
      "type": "content",
      "dialogue": [
        {
          "speaker": "sarah",
          "text": "Let's start with the basics. Marcus, can you give us a quick overview of Tesla's current position?",
          "notes": "tone: inquisitive, pace: moderate"
        },
        {
          "speaker": "marcus",
          "text": "Sure thing. Tesla is the world's leading electric vehicle manufacturer with a market cap hovering around 800 billion dollars. They're not just about cars though - we're seeing significant expansion in energy storage and solar.",
          "notes": "tone: informative, pace: moderate"
        },
        {
          "speaker": "alex",
          "text": "And the numbers back that up. In Q3 2024, they delivered over 435,000 vehicles globally, which is a 6% increase year-over-year.",
          "notes": "tone: factual, pace: moderate, emphasis: 'six percent'"
        },
        {
          "speaker": "sarah",
          "text": "That's impressive growth. But Alex, what about their financial health? Are they profitable?",
          "notes": "tone: curious, pace: moderate"
        }
        // ... more dialogue
      ]
    }
  ],
  "music_cues": {
    "intro": "upbeat_corporate",
    "transitions": ["subtle_swoosh"],
    "outro": "closing_theme"
  }
}
```

---

## 5. Text-to-Speech Integration

### 5.1 TTS Provider Options

**Option 1: OpenAI TTS API** (Recommended for MVP)

**Pros:**
- Already integrated with OpenAI for LLM
- High quality, natural voices
- 6 built-in voices with distinct personalities
- HD quality available
- Reasonable pricing ($15/million characters)

**Cons:**
- Less voice customization than specialized providers
- Cannot clone custom voices

**Implementation:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateSpeech(text: string, voice: string): Promise<Buffer> {
  const mp3 = await openai.audio.speech.create({
    model: "tts-1-hd", // High quality
    voice: voice as any, // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
    input: text,
    speed: 1.0,
  });

  return Buffer.from(await mp3.arrayBuffer());
}
```

**Voice Character Mapping:**
- **Alloy**: Neutral, professional host
- **Echo**: Warm, analytical expert
- **Fable**: Energetic, enthusiastic analyst
- **Onyx**: Deep, authoritative correspondent
- **Nova**: Clear, friendly reporter
- **Shimmer**: Bright, engaging moderator

**Option 2: ElevenLabs** (Premium Quality)

**Pros:**
- Industry-leading natural voices
- Voice cloning capability
- Emotional range control
- Multiple languages

**Cons:**
- More expensive ($0.18-$0.30 per 1K characters)
- Additional API integration needed
- Requires separate account/billing

**Option 3: Azure Cognitive Services**

**Pros:**
- Microsoft ecosystem integration
- Many language options
- SSML support for fine control
- Good enterprise support

**Cons:**
- Voice quality slightly behind OpenAI/ElevenLabs
- More complex API

### 5.2 Voice Processing Parameters

```typescript
interface VoiceParameters {
  voiceId: string;
  speed: number; // 0.25 to 4.0
  pitch?: number; // -20 to +20 (ElevenLabs)
  stability?: number; // 0 to 1 (ElevenLabs)
  clarity?: number; // 0 to 1 (ElevenLabs)
  style?: number; // 0 to 1 (ElevenLabs)
}

interface TTSRequest {
  text: string;
  speaker: string;
  voice: VoiceParameters;
  outputFormat: 'mp3' | 'wav' | 'pcm';
  sampleRate: 22050 | 44100 | 48000;
}
```

---

## 6. Audio Processing & Mixing

### 6.1 Audio Assembly Pipeline

**Tools:**
- **FFmpeg**: Industry-standard audio/video processing
- **Node.js libraries**: fluent-ffmpeg, node-lame
- **Audio mixing**: Combine multiple tracks

**Processing Steps:**

1. **Generate individual speech segments**
   - Convert each dialogue line to audio
   - Store temporary files

2. **Add pauses and transitions**
   - Insert silence between speakers (0.5-1s)
   - Add breathing room

3. **Mix background music**
   - Intro music (fade in)
   - Subtle background during content (low volume)
   - Outro music (fade out)

4. **Normalize audio levels**
   - Ensure consistent volume
   - Prevent clipping
   - Apply compression

5. **Export final MP3**
   - Bitrate: 128kbps (standard) or 192kbps (high quality)
   - Sample rate: 44.1kHz
   - Stereo mixing

### 6.2 Implementation Example

```typescript
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

class AudioProcessor {
  async mixPodcast(segments: AudioSegment[], options: PodcastOptions): Promise<string> {
    const tempDir = path.join(process.env.STORAGE_PATH!, 'temp');
    const outputPath = path.join(process.env.STORAGE_PATH!, 'podcasts', `${options.id}.mp3`);

    // Create FFmpeg command
    const command = ffmpeg();

    // Add all speech segments
    segments.forEach(segment => {
      command.input(segment.audioPath);
    });

    // Add background music
    if (options.backgroundMusic) {
      command.input(options.backgroundMusic)
        .audioFilters([
          'volume=0.15', // Lower music volume
          'afade=t=in:st=0:d=2', // Fade in
          'afade=t=out:st=' + (options.duration - 2) + ':d=2' // Fade out
        ]);
    }

    // Concatenate speech segments with pauses
    const filterComplex = this.buildFilterComplex(segments);
    command.complexFilter(filterComplex);

    // Audio processing
    command
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .audioFrequency(44100)
      .audioChannels(2);

    // Execute
    return new Promise((resolve, reject) => {
      command
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private buildFilterComplex(segments: AudioSegment[]): string {
    // Build FFmpeg filter for mixing audio with pauses
    const filters: string[] = [];

    segments.forEach((segment, index) => {
      // Add silence between segments
      if (index > 0) {
        filters.push(`[${index}:a]adelay=500|500[a${index}]`);
      }
    });

    // Concatenate all segments
    const inputs = segments.map((_, i) => `[a${i}]`).join('');
    filters.push(`${inputs}concat=n=${segments.length}:v=0:a=1[outa]`);

    return filters.join(';');
  }
}
```

### 6.3 Background Music

**Music Assets:**
- **Intro Theme**: Upbeat, professional (10-15 seconds)
- **Background Ambience**: Subtle, non-distracting
- **Transition Stings**: Brief audio cues (1-2 seconds)
- **Outro Theme**: Closing, call-to-action feel

**Sources:**
- Royalty-free music libraries (Epidemic Sound, Artlist)
- Creative Commons licensed tracks
- Custom commissioned pieces

---

## 7. Database Schema Updates

### 7.1 Enum Updates

```prisma
enum ReportFormat {
  PDF
  DOCX
  PODCAST  // NEW
}

enum DeliveryMethod {
  DOWNLOAD
  WEBEX
  STREAM   // NEW - for in-app streaming
}

enum PodcastDuration {
  SHORT     // 5 minutes
  STANDARD  // 10-15 minutes
  LONG      // 15-20 minutes
}

enum PodcastTemplate {
  EXECUTIVE_BRIEF
  STRATEGIC_DEBATE
  INDUSTRY_PULSE
  DEEP_DIVE
}
```

### 7.2 New Tables

```prisma
model PodcastGeneration {
  id              String           @id @default(uuid())
  reportId        String
  report          Report           @relation(fields: [reportId], references: [id], onDelete: Cascade)

  template        PodcastTemplate
  duration        PodcastDuration

  // Script generation
  script          Json?            // Generated dialogue script
  scriptGeneratedAt DateTime?

  // Audio generation
  audioSegments   Json?            // Paths to individual audio files
  finalAudioPath  String?          // Path to final mixed MP3
  audioGeneratedAt DateTime?

  // Metadata
  durationSeconds Int?
  fileSizeBytes   BigInt?

  status          PodcastStatus    @default(PENDING)
  error           String?

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  completedAt     DateTime?

  @@index([reportId])
  @@index([status])
}

enum PodcastStatus {
  PENDING
  GENERATING_SCRIPT
  GENERATING_AUDIO
  MIXING
  COMPLETED
  FAILED
}

model PodcastHost {
  id              String           @id @default(uuid())
  name            String
  role            String           // 'host', 'analyst', 'expert', etc.
  personality     String           // 'analytical', 'enthusiastic', etc.
  voiceId         String           // TTS voice identifier
  voiceProvider   String           // 'openai', 'elevenlabs', etc.
  isActive        Boolean          @default(true)

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([isActive])
}

model PodcastTemplate {
  id              String           @id @default(uuid())
  name            String
  description     String?
  templateType    PodcastTemplate
  duration        PodcastDuration

  configuration   Json             // Full template structure

  isActive        Boolean          @default(true)

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([templateType])
  @@index([isActive])
}
```

### 7.3 Updated Report Model

```prisma
model Report {
  // ... existing fields ...

  format          ReportFormat[]   // Can include PODCAST

  // Add podcast generation relation
  podcastGeneration PodcastGeneration?

  // ... rest of existing fields ...
}
```

---

## 8. API Endpoints

### 8.1 New Podcast Endpoints

```typescript
// Generate podcast for existing report
POST /api/reports/:id/podcast
Body: {
  template: 'EXECUTIVE_BRIEF' | 'STRATEGIC_DEBATE' | 'INDUSTRY_PULSE',
  duration: 'SHORT' | 'STANDARD' | 'LONG'
}

// Get podcast generation status
GET /api/reports/:id/podcast/status

// Download podcast
GET /api/reports/:id/podcast/download

// Stream podcast
GET /api/reports/:id/podcast/stream

// Get podcast script (for review)
GET /api/reports/:id/podcast/script

// Regenerate podcast with different settings
POST /api/reports/:id/podcast/regenerate
Body: {
  template?: string,
  duration?: string
}

// List available podcast templates
GET /api/podcasts/templates

// List available podcast hosts
GET /api/podcasts/hosts

// Admin: Create/update podcast template
POST /api/admin/podcasts/templates
PUT /api/admin/podcasts/templates/:id

// Admin: Manage podcast hosts
POST /api/admin/podcasts/hosts
PUT /api/admin/podcasts/hosts/:id
```

### 8.2 Report Creation Update

```typescript
POST /api/reports
Body: {
  workflowType: string,
  configuration: object,
  inputData: object,
  format: ['PDF', 'DOCX', 'PODCAST'],  // Can select multiple

  // New podcast options (optional)
  podcastOptions?: {
    template: 'EXECUTIVE_BRIEF',
    duration: 'STANDARD'
  }
}
```

---

## 9. Service Layer Implementation

### 9.1 Podcast Service Architecture

```typescript
// services/podcast/podcast.service.ts
export class PodcastService {
  constructor(
    private scriptGenerator: ScriptGeneratorService,
    private ttsService: TTSService,
    private audioProcessor: AudioProcessorService,
    private storageService: StorageService
  ) {}

  async generatePodcast(
    reportId: string,
    options: PodcastOptions
  ): Promise<PodcastGeneration> {
    // 1. Create podcast generation record
    const podcastGen = await prisma.podcastGeneration.create({
      data: {
        reportId,
        template: options.template,
        duration: options.duration,
        status: 'PENDING',
      },
    });

    // 2. Queue background job
    await this.queuePodcastGeneration(podcastGen.id);

    return podcastGen;
  }

  async executePodcastGeneration(podcastGenId: string): Promise<void> {
    try {
      // Update status
      await this.updateStatus(podcastGenId, 'GENERATING_SCRIPT');

      // Step 1: Generate script
      const script = await this.scriptGenerator.generateScript(podcastGenId);
      await this.saveScript(podcastGenId, script);

      // Update status
      await this.updateStatus(podcastGenId, 'GENERATING_AUDIO');

      // Step 2: Generate audio segments
      const audioSegments = await this.ttsService.generateAllSegments(script);
      await this.saveAudioSegments(podcastGenId, audioSegments);

      // Update status
      await this.updateStatus(podcastGenId, 'MIXING');

      // Step 3: Mix audio
      const finalAudio = await this.audioProcessor.mixPodcast(
        audioSegments,
        script.musicCues
      );
      await this.saveFinalAudio(podcastGenId, finalAudio);

      // Mark complete
      await this.updateStatus(podcastGenId, 'COMPLETED');

    } catch (error) {
      await this.handleError(podcastGenId, error);
    }
  }
}
```

### 9.2 Script Generator Service

```typescript
// services/podcast/script-generator.service.ts
export class ScriptGeneratorService {
  constructor(private llmService: LLMService) {}

  async generateScript(podcastGenId: string): Promise<PodcastScript> {
    // 1. Load report content
    const report = await this.loadReport(podcastGenId);

    // 2. Load template
    const template = await this.loadTemplate(podcastGenId);

    // 3. Build prompt
    const prompt = this.buildScriptPrompt(report, template);

    // 4. Call LLM
    const response = await this.llmService.generateCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8, // More creative for natural dialogue
      maxTokens: 4000,
    });

    // 5. Parse and validate script
    const script = JSON.parse(response.content);
    this.validateScript(script);

    return script;
  }

  private buildScriptPrompt(report: Report, template: PodcastTemplateConfig): string {
    const targetWordCount = this.calculateWordCount(template.duration);

    return PODCAST_SCRIPT_PROMPT
      .replace('{reportType}', report.workflowType)
      .replace('{reportContent}', JSON.stringify(report.generatedContent))
      .replace('{templateName}', template.name)
      .replace('{durationMinutes}', template.estimatedMinutes.toString())
      .replace('{hostDescriptions}', JSON.stringify(template.hosts))
      .replace('{targetWordCount}', targetWordCount.toString())
      .replace('{fullReportContent}', this.formatReportContent(report));
  }

  private calculateWordCount(duration: PodcastDuration): number {
    // Average speaking rate: 150-160 words per minute
    const wordsPerMinute = 155;

    const minutes = {
      SHORT: 5,
      STANDARD: 12,
      LONG: 18,
    }[duration];

    return minutes * wordsPerMinute;
  }
}
```

### 9.3 TTS Service

```typescript
// services/podcast/tts.service.ts
export class TTSService {
  constructor(
    private openai: OpenAI,
    private storageService: StorageService
  ) {}

  async generateAllSegments(script: PodcastScript): Promise<AudioSegment[]> {
    const segments: AudioSegment[] = [];

    for (const segment of script.segments) {
      for (const dialogue of segment.dialogue) {
        const audio = await this.generateSpeech(
          dialogue.text,
          dialogue.speaker,
          dialogue.notes
        );

        const filePath = await this.storageService.saveAudioSegment(
          audio,
          `${dialogue.speaker}_${Date.now()}.mp3`
        );

        segments.push({
          speaker: dialogue.speaker,
          text: dialogue.text,
          audioPath: filePath,
          duration: await this.getAudioDuration(filePath),
        });
      }
    }

    return segments;
  }

  private async generateSpeech(
    text: string,
    speakerId: string,
    notes: string
  ): Promise<Buffer> {
    // Get voice mapping for speaker
    const voiceId = await this.getVoiceForSpeaker(speakerId);

    // Parse notes for speed adjustment
    const speed = this.parseSpeedFromNotes(notes);

    // Generate speech
    const mp3 = await this.openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: voiceId,
      input: text,
      speed,
    });

    return Buffer.from(await mp3.arrayBuffer());
  }

  private async getVoiceForSpeaker(speakerId: string): Promise<string> {
    // Load from database
    const host = await prisma.podcastHost.findFirst({
      where: { id: speakerId },
    });

    return host?.voiceId || 'alloy'; // Default voice
  }

  private parseSpeedFromNotes(notes: string): number {
    if (notes.includes('pace: slow')) return 0.9;
    if (notes.includes('pace: fast') || notes.includes('pace: energetic')) return 1.1;
    return 1.0; // normal
  }
}
```

---

## 10. Frontend UI Components

### 10.1 Podcast Format Selector

```tsx
// components/reports/PodcastFormatSelector.tsx
export function PodcastFormatSelector({
  value,
  onChange
}: PodcastFormatSelectorProps) {
  return (
    <div className="space-y-4">
      <Label>Select Report Formats</Label>

      <div className="grid grid-cols-3 gap-4">
        <Card className={value.includes('PDF') ? 'border-primary' : ''}>
          <CardContent className="pt-6">
            <Checkbox
              checked={value.includes('PDF')}
              onCheckedChange={(checked) => toggleFormat('PDF', checked)}
            />
            <FileText className="w-8 h-8 mt-2" />
            <h3 className="font-semibold mt-2">PDF</h3>
            <p className="text-sm text-muted-foreground">
              Professional document format
            </p>
          </CardContent>
        </Card>

        <Card className={value.includes('DOCX') ? 'border-primary' : ''}>
          <CardContent className="pt-6">
            <Checkbox
              checked={value.includes('DOCX')}
              onCheckedChange={(checked) => toggleFormat('DOCX', checked)}
            />
            <FileType className="w-8 h-8 mt-2" />
            <h3 className="font-semibold mt-2">Word</h3>
            <p className="text-sm text-muted-foreground">
              Editable document format
            </p>
          </CardContent>
        </Card>

        <Card className={value.includes('PODCAST') ? 'border-primary' : ''}>
          <CardContent className="pt-6">
            <Checkbox
              checked={value.includes('PODCAST')}
              onCheckedChange={(checked) => {
                toggleFormat('PODCAST', checked);
                if (checked) setShowPodcastOptions(true);
              }}
            />
            <Mic className="w-8 h-8 mt-2" />
            <h3 className="font-semibold mt-2">Virtual Podcast</h3>
            <p className="text-sm text-muted-foreground">
              AI-generated audio discussion
            </p>
          </CardContent>
        </Card>
      </div>

      {value.includes('PODCAST') && (
        <PodcastOptionsPanel
          options={podcastOptions}
          onChange={setPodcastOptions}
        />
      )}
    </div>
  );
}
```

### 10.2 Podcast Options Panel

```tsx
// components/reports/PodcastOptionsPanel.tsx
export function PodcastOptionsPanel({ options, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Podcast Settings</CardTitle>
        <CardDescription>
          Customize your AI-generated podcast discussion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div>
          <Label>Conversation Style</Label>
          <Select
            value={options.template}
            onValueChange={(value) => onChange({ ...options, template: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXECUTIVE_BRIEF">
                <div>
                  <div className="font-semibold">Executive Brief</div>
                  <div className="text-sm text-muted-foreground">
                    Professional interview format with host and analysts
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="STRATEGIC_DEBATE">
                <div>
                  <div className="font-semibold">Strategic Debate</div>
                  <div className="text-sm text-muted-foreground">
                    Head-to-head competitive analysis discussion
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="INDUSTRY_PULSE">
                <div>
                  <div className="font-semibold">Industry Pulse</div>
                  <div className="text-sm text-muted-foreground">
                    News roundtable covering multiple accounts
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Duration Selection */}
        <div>
          <Label>Duration</Label>
          <RadioGroup
            value={options.duration}
            onValueChange={(value) => onChange({ ...options, duration: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="SHORT" id="short" />
              <Label htmlFor="short">
                Quick Summary (5 minutes)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="STANDARD" id="standard" />
              <Label htmlFor="standard">
                Standard Discussion (10-15 minutes)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="LONG" id="long" />
              <Label htmlFor="long">
                Deep Dive (15-20 minutes)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Preview Hosts */}
        <div>
          <Label>Podcast Hosts</Label>
          <div className="mt-2 space-y-2">
            {getTemplateHosts(options.template).map((host) => (
              <div key={host.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                <Avatar>
                  <AvatarFallback>{host.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{host.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {host.role} • {host.personality}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 10.3 Podcast Player Component

```tsx
// components/reports/PodcastPlayer.tsx
export function PodcastPlayer({ reportId }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Mic className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Virtual Podcast</CardTitle>
              <CardDescription>AI-generated discussion</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download MP3
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Audio Player Controls */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={([value]) => seekTo(value)}
          />

          {/* Time Display */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => skip(-10)}>
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              size="icon"
              className="w-12 h-12"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => skip(10)}>
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Playback Speed */}
          <div className="flex items-center justify-center gap-2">
            <Label className="text-sm">Speed:</Label>
            <Select value={playbackRate.toString()} onValueChange={setPlaybackRate}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.75">0.75x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="1.25">1.25x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={`/api/reports/${reportId}/podcast/stream`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
      </CardContent>
    </Card>
  );
}
```

---

## 11. Cost Analysis

### 11.1 Per-Podcast Generation Cost

**Assumptions:**
- Average 10-minute podcast
- ~1,500 words of dialogue
- OpenAI TTS HD: $15 per 1 million characters
- OpenAI GPT-4 for script: ~$0.03 per 1K input tokens, $0.06 per 1K output tokens

**Script Generation:**
- Input: ~8,000 tokens (report content + prompt)
- Output: ~2,000 tokens (script)
- Cost: (8 × $0.03) + (2 × $0.06) = $0.36

**TTS Generation:**
- Text: ~7,500 characters (1,500 words × 5 chars/word average)
- Cost: 7,500 × ($15 / 1,000,000) = $0.11

**Total per Podcast:** ~$0.47

**At Scale:**
- 100 podcasts/month: $47
- 500 podcasts/month: $235
- 1,000 podcasts/month: $470

### 11.2 Storage & Bandwidth

**File Sizes:**
- 10-minute podcast at 192kbps MP3: ~14.4 MB
- Storage cost (local): Minimal
- Bandwidth: If serving 1,000 podcasts with average 2 downloads each = 28.8 GB

---

## 12. Implementation Timeline

### 12.1 Phase 1: Core Podcast Generation (Week 1-2)

**Week 1:**
- [ ] Update database schema with podcast tables
- [ ] Create podcast service layer structure
- [ ] Implement script generation service
  - [ ] Design prompt templates
  - [ ] Create conversation templates
  - [ ] LLM integration for script generation
- [ ] Test script generation with sample reports

**Week 2:**
- [ ] Implement TTS service
  - [ ] OpenAI TTS integration
  - [ ] Voice mapping system
  - [ ] Audio segment generation
- [ ] Test TTS with generated scripts
- [ ] Basic audio file storage

**Deliverables:**
- Working script generation
- TTS audio generation
- Raw audio segments

### 12.2 Phase 2: Audio Processing & Mixing (Week 3)

- [ ] Implement audio processor service
  - [ ] FFmpeg integration
  - [ ] Audio mixing logic
  - [ ] Silence/pause insertion
  - [ ] Background music integration
- [ ] Source or create intro/outro music
- [ ] Audio normalization and export
- [ ] Test complete pipeline end-to-end

**Deliverables:**
- Complete podcast audio files
- Mixed and mastered quality

### 12.3 Phase 3: API & Backend Integration (Week 4)

- [ ] Create podcast API endpoints
- [ ] Integrate with report generation workflow
- [ ] Implement background job processing
- [ ] Add podcast status tracking
- [ ] Error handling and retries

**Deliverables:**
- Working API for podcast generation
- Background job system
- Status tracking

### 12.4 Phase 4: Frontend UI (Week 5)

- [ ] Create podcast format selector
- [ ] Build podcast options panel
- [ ] Implement podcast player component
- [ ] Add podcast to report detail view
- [ ] Download functionality

**Deliverables:**
- Complete UI for podcast feature
- Player with controls
- Download capability

### 12.5 Phase 5: Delivery & Streaming (Week 6)

- [ ] Implement streaming endpoint
- [ ] Webex bot podcast delivery
- [ ] Optimize file serving
- [ ] Add caching for better performance

**Deliverables:**
- Streaming playback
- Webex integration
- Optimized delivery

### 12.6 Phase 6: Polish & Testing (Week 7)

- [ ] Comprehensive testing
  - [ ] All workflow types
  - [ ] Different duration options
  - [ ] Edge cases
- [ ] Quality assurance
- [ ] Performance optimization
- [ ] Documentation

**Deliverables:**
- Production-ready feature
- Complete documentation
- Test coverage

**Total Timeline: 7 weeks**

---

## 13. Success Metrics

### 13.1 Quality Metrics

- **Script Quality**: Natural, engaging dialogue (manual review)
- **Audio Quality**: Clear, professional-sounding output
- **Content Accuracy**: Faithful to source report (95%+ accuracy)
- **Generation Time**: <5 minutes for standard podcast

### 13.2 User Engagement Metrics

- **Adoption Rate**: % of reports generated with podcast format
- **Completion Rate**: % of podcasts listened to completion
- **Feedback Score**: User satisfaction rating
- **Usage Frequency**: Average podcasts generated per user

### 13.3 Technical Metrics

- **Success Rate**: % of podcasts generated without errors
- **Generation Time**: Average time to generate
- **File Size**: Average and distribution
- **Cost per Podcast**: Track actual costs

---

## 14. Future Enhancements

### 14.1 Phase 2 Features

1. **Voice Cloning**
   - Allow users to clone their own voice
   - Custom branded podcast hosts
   - ElevenLabs integration

2. **Multi-Language Support**
   - Generate podcasts in different languages
   - Localized hosts and styles

3. **Interactive Transcripts**
   - Show transcript synchronized with audio
   - Click to jump to specific sections

4. **Custom Music**
   - Upload custom intro/outro music
   - Brand-specific audio identity

5. **Podcast Series**
   - Recurring podcast series for accounts
   - Episode numbering and continuity

### 14.2 Phase 3 Features

1. **RSS Feed Support**
   - Subscribe to account podcast feed
   - Auto-generate new episodes

2. **Video Podcasts**
   - Add avatars or visualizations
   - Video format for YouTube/LinkedIn

3. **Live Editing**
   - Edit generated script before audio generation
   - Customize dialogue

4. **Analytics Dashboard**
   - Detailed listening analytics
   - Popular sections, drop-off points

---

## 15. Risk Assessment & Mitigation

### 15.1 Technical Risks

**Risk:** Poor audio quality / robotic voices
- **Mitigation**: Use HD TTS models, extensive testing, voice selection
- **Impact**: High
- **Probability**: Medium

**Risk:** Long generation times (>10 minutes)
- **Mitigation**: Optimize pipeline, use background jobs, show progress
- **Impact**: Medium
- **Probability**: Medium

**Risk:** High costs if usage scales unexpectedly
- **Mitigation**: Usage limits, monitoring, cost alerts
- **Impact**: High
- **Probability**: Low

### 15.2 Content Risks

**Risk:** AI generates inaccurate information
- **Mitigation**: Strict adherence to source content, validation, human review option
- **Impact**: Critical
- **Probability**: Low

**Risk:** Unnatural or confusing dialogue
- **Mitigation**: Careful prompt engineering, testing, templates
- **Impact**: Medium
- **Probability**: Medium

### 15.3 User Adoption Risks

**Risk:** Users don't find value in podcast format
- **Mitigation**: User research, feedback loop, pilot program
- **Impact**: Medium
- **Probability**: Low

---

## 16. Conclusion

The Virtual Podcast feature represents a significant enhancement to the IIoT Account Intelligence platform, offering:

✅ **Differentiation**: Unique value proposition in the market
✅ **Accessibility**: Audio format for on-the-go consumption
✅ **Engagement**: More engaging than traditional reports
✅ **Flexibility**: Multiple formats for different use cases
✅ **Scalability**: Automated generation at scale

**Recommended Next Steps:**

1. **Review & Approve**: Stakeholder review of this design
2. **Pilot Program**: Start with one workflow type (Account Intelligence)
3. **User Testing**: Get early feedback from select users
4. **Iterate**: Refine based on feedback
5. **Full Rollout**: Deploy to all users

The architecture is well-positioned to support this feature with minimal disruption to existing functionality, and the phased implementation approach allows for iterative improvements based on real-world usage.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-24
**Status**: Proposed Design - Awaiting Approval

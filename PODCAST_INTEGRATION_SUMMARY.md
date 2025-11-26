# Virtual Podcast Feature - Integration Summary

## Quick Overview

The Virtual Podcast feature adds a **third delivery option** to the IIoT Account Intelligence platform, transforming written reports into engaging, multi-person audio discussions.

### Three Delivery Options:

1. **PDF** - Professional document format
2. **Word (DOCX)** - Editable document format
3. **Virtual Podcast (NEW)** - AI-generated audio discussion

---

## Architecture Integration Points

### 1. Database Changes

**Add to Existing Enums:**
```prisma
enum ReportFormat {
  PDF
  DOCX
  PODCAST  // NEW
}

enum DeliveryMethod {
  DOWNLOAD
  WEBEX
  STREAM   // NEW
}
```

**New Tables:**
- `PodcastGeneration` - Tracks podcast creation status
- `PodcastHost` - Virtual hosts with voice mappings
- `PodcastTemplate` - Conversation templates (Executive Brief, Strategic Debate, etc.)

**New Enums:**
- `PodcastStatus` - PENDING, GENERATING_SCRIPT, GENERATING_AUDIO, MIXING, COMPLETED, FAILED
- `PodcastDuration` - SHORT (5min), STANDARD (10-15min), LONG (15-20min)
- `PodcastTemplate` - EXECUTIVE_BRIEF, STRATEGIC_DEBATE, INDUSTRY_PULSE

### 2. Backend Services

**New Services:**
```
services/podcast/
├── podcast.service.ts         # Main orchestration
├── script-generator.service.ts # LLM-powered dialogue creation
├── tts.service.ts             # Text-to-speech conversion
└── audio-processor.service.ts # Audio mixing & mastering
```

**Integration with Existing:**
- Uses existing `LLMService` for script generation
- Extends `StorageService` for audio files
- Leverages `ReportService` for content extraction
- Utilizes existing job queue for background processing

### 3. API Endpoints

**New Routes:**
```
POST   /api/reports/:id/podcast          # Generate podcast
GET    /api/reports/:id/podcast/status   # Check generation status
GET    /api/reports/:id/podcast/download # Download MP3
GET    /api/reports/:id/podcast/stream   # Stream audio
GET    /api/reports/:id/podcast/script   # View generated script

GET    /api/podcasts/templates            # List available templates
GET    /api/podcasts/hosts                # List virtual hosts
```

**Updated Routes:**
```
POST   /api/reports
# Now accepts format: ['PDF', 'DOCX', 'PODCAST']
# New optional field: podcastOptions: { template, duration }
```

### 4. Frontend Components

**New UI Components:**
```
components/reports/
├── PodcastFormatSelector.tsx   # Checkbox for podcast option
├── PodcastOptionsPanel.tsx     # Template & duration selector
├── PodcastPlayer.tsx          # Audio player with controls
└── PodcastGenerationStatus.tsx # Progress indicator
```

**Integration Points:**
- Extends `ReportConfigForm` with podcast options
- Adds player to `ReportDetailView`
- Updates `ReportListItem` with podcast indicator

---

## User Experience Flow

### Creating a Report with Podcast

```
1. User selects workflow (Account Intelligence, Competitive Intelligence, or News Digest)
2. User configures report sections
3. User selects formats:
   ☑ PDF
   ☑ Word
   ☑ Virtual Podcast
4. [IF PODCAST SELECTED] User chooses:
   - Template: Executive Brief / Strategic Debate / Industry Pulse
   - Duration: Short (5min) / Standard (10-15min) / Long (15-20min)
5. User clicks "Generate Report"
6. System generates all selected formats in parallel
7. User sees progress: "Generating script..." → "Converting to audio..." → "Mixing..." → "Complete!"
8. User can:
   - Play podcast inline
   - Download MP3
   - Send via Webex
```

### Listening to a Podcast

```
Report Detail Page shows:
┌─────────────────────────────────────┐
│ 🎙️ Virtual Podcast                  │
│ AI-generated discussion • 12:34     │
│ ━━━━━━━━━━━━━━━━━━━━━━━○─ 8:15     │
│ ⏮️  ▶️  ⏭️              Speed: 1x   │
│ [Download MP3] [Send to Webex]     │
└─────────────────────────────────────┘
```

---

## Podcast Generation Pipeline

### Step 1: Script Generation (30-60 seconds)

**Input:** Report content (JSON)
**Process:**
- LLM analyzes report
- Applies conversation template
- Generates multi-person dialogue with natural flow
- Includes speaker notes (tone, pace, emphasis)

**Output:** Structured script in JSON format

**Example:**
```json
{
  "title": "Tesla Inc. - Account Intelligence",
  "segments": [
    {
      "type": "intro",
      "dialogue": [
        {
          "speaker": "sarah",
          "text": "Welcome to IIoT Intelligence Brief...",
          "notes": "tone: professional, pace: moderate"
        }
      ]
    }
  ]
}
```

### Step 2: Audio Generation (60-120 seconds)

**Input:** Script with dialogue
**Process:**
- Convert each dialogue line to speech via OpenAI TTS
- Each speaker gets distinct voice (Alloy, Echo, Fable, etc.)
- Generate individual audio segments
- Apply speed/pitch adjustments based on notes

**Output:** Multiple MP3 segments (one per dialogue line)

### Step 3: Audio Mixing (30-60 seconds)

**Input:** Audio segments + background music
**Process:**
- Concatenate segments with natural pauses
- Mix in background music at low volume
- Add intro/outro music
- Normalize audio levels
- Apply mastering effects

**Output:** Final mixed MP3 file

**Total Time:** 2-4 minutes for standard podcast

---

## Technology Stack

### Core Technologies

**Script Generation:**
- OpenAI GPT-4 (or X.ai Grok-2)
- Custom prompt templates
- JSON structured output

**Text-to-Speech:**
- **Primary:** OpenAI TTS API
  - 6 voices: Alloy, Echo, Fable, Onyx, Nova, Shimmer
  - HD quality (tts-1-hd model)
  - Cost: ~$0.11 per podcast
- **Alternative:** ElevenLabs (premium option)

**Audio Processing:**
- FFmpeg (audio manipulation)
- Node.js fluent-ffmpeg wrapper
- Audio normalization & compression

**Storage:**
- Local filesystem (self-hosted)
- Organized: `/storage/podcasts/{reportId}.mp3`

### Dependencies to Add

**Backend:**
```bash
npm install fluent-ffmpeg node-lame
# FFmpeg binary (install separately on server)
```

**Frontend:**
```bash
npm install react-audio-player
# Or use HTML5 <audio> element
```

---

## Cost Analysis

### Per-Podcast Costs

**10-minute Standard Podcast:**
- Script generation (GPT-4): $0.36
- TTS conversion (OpenAI): $0.11
- **Total: ~$0.47 per podcast**

**Monthly Estimates:**
- 100 podcasts: $47/month
- 500 podcasts: $235/month
- 1,000 podcasts: $470/month

**Storage:**
- 10-minute MP3 at 192kbps: ~14 MB
- 1,000 podcasts: ~14 GB storage

---

## Conversation Templates

### 1. Executive Brief (Account Intelligence)

**Format:** Interview-style deep dive
**Hosts:** Sarah (host), Marcus (analyst), Alex (researcher)
**Duration:** 10-15 minutes
**Segments:**
- Intro (30s)
- Company Overview (3min)
- Financial Analysis (3min)
- Security & News (2-3min)
- Key Takeaways (1-2min)
- Outro (30s)

**Use Cases:**
- Pre-meeting account briefings
- Executive summaries
- Sales enablement

### 2. Strategic Debate (Competitive Intelligence)

**Format:** Analytical discussion
**Hosts:** Jordan (moderator), Morgan (strategist), Taylor (analyst)
**Duration:** 10-15 minutes
**Segments:**
- Intro (30s)
- Competitor Overview (3min)
- Head-to-Head Analysis (4-5min)
- Win Strategies (2-3min)
- Outro (30s)

**Use Cases:**
- Competitive positioning
- Deal preparation
- Strategy sessions

### 3. Industry Pulse (News Digest)

**Format:** News roundtable
**Hosts:** Riley (anchor), Casey (reporter), Drew (reporter)
**Duration:** 5-10 minutes
**Segments:**
- Intro (15s)
- News Items per Account (4-8min)
- Week Ahead (1min)
- Outro (15s)

**Use Cases:**
- Weekly account updates
- Team briefings
- Morning updates

---

## Implementation Phases

### Minimum Viable Product (MVP) - 4 weeks

**Week 1-2: Core Generation**
- Database schema
- Script generation service
- TTS integration
- Basic audio assembly

**Week 3: Backend Integration**
- API endpoints
- Background job processing
- Status tracking

**Week 4: Frontend UI**
- Format selector
- Options panel
- Basic player

**MVP Deliverable:** Working podcast generation for Account Intelligence reports with one template

### Phase 2: Enhancement - 2-3 weeks

- Additional templates (Strategic Debate, Industry Pulse)
- Audio mixing improvements
- Better player UI
- Webex delivery

### Phase 3: Advanced Features - Ongoing

- Voice cloning
- Multi-language support
- Custom music
- Interactive transcripts

---

## Key Benefits

### For Users

✅ **Accessibility** - Listen on-the-go, during commute, while exercising
✅ **Efficiency** - Consume 15-page report in 10-minute audio
✅ **Engagement** - More engaging than reading text
✅ **Retention** - Better information retention through audio
✅ **Multi-tasking** - Listen while doing other tasks

### For Business

✅ **Differentiation** - Unique feature in market
✅ **Value Add** - Premium feature for platform
✅ **User Retention** - Increased platform stickiness
✅ **Viral Potential** - Easy to share podcasts
✅ **Analytics** - Rich data on content consumption

---

## Success Criteria

### Quality Metrics

- Natural-sounding dialogue (passes "uncanny valley" test)
- Accurate content representation (95%+ accuracy)
- Professional audio quality
- <5 minute generation time

### Adoption Metrics

- 30%+ of reports generated with podcast format
- 70%+ podcast completion rate
- 4+ user satisfaction score (out of 5)
- 95%+ success rate (no errors)

---

## Next Steps

1. **Review Design** - Stakeholder approval
2. **Prototype** - Build MVP for one template
3. **User Testing** - 5-10 users pilot program
4. **Iterate** - Refine based on feedback
5. **Launch** - Full rollout

---

## Questions for Stakeholders

1. **Priority:** Is this feature high priority for near-term roadmap?
2. **Resources:** Can we allocate 1-2 developers for 4 weeks?
3. **Budget:** Are we comfortable with ~$0.50/podcast generation cost?
4. **Templates:** Which conversation style should we launch with first?
5. **Voices:** Should we invest in premium voices (ElevenLabs) or start with OpenAI?
6. **Timeline:** Target launch date?

---

**Document Version**: 1.0
**Last Updated**: 2025-11-24
**Status**: Proposed - Awaiting Decision

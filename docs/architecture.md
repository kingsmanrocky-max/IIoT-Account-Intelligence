# IIoT Account Intelligence - Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Service Layer Architecture](#service-layer-architecture)
4. [Database Schema](#database-schema)
5. [Authentication Flow](#authentication-flow)
6. [Report Generation Pipeline](#report-generation-pipeline)
7. [Podcast Generation Pipeline](#podcast-generation-pipeline)
8. [API Endpoints](#api-endpoints)

---

## System Overview

The IIoT Account Intelligence application is a full-stack web platform that leverages AI (OpenAI GPT-4, X.ai Grok) to generate comprehensive intelligence reports about companies, competitors, and industry news. The system features three primary workflows and supports three output formats: PDF, Word documents, and AI-generated podcasts.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Web UI    │  │  Mobile    │  │  Webex     │            │
│  │  (Next.js) │  │  Browser   │  │  Bot       │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│                     Nginx Reverse Proxy                      │
│                (TLS Termination + Load Balancing)            │
└───────────────────────┬─────────────────────────────────────┘
            ┌───────────┴───────────┐
            │                       │
┌───────────▼───────────┐ ┌────────▼──────────┐
│   Next.js Frontend    │ │  Fastify Backend  │
│   (Port 4000)         │ │  (Port 4001)      │
│                       │ │                   │
│ • React 18            │ │ • REST API        │
│ • TypeScript          │ │ • Services Layer  │
│ • Tailwind CSS        │ │ • Background Jobs │
│ • React Query         │ │ • Prisma ORM      │
└───────────────────────┘ └───────┬───────────┘
                                  │
        ┌─────────────────────────┼─────────────────────┐
        │                         │                     │
┌───────▼────────┐    ┌──────────▼─────────┐  ┌───────▼────────┐
│  PostgreSQL    │    │      Redis         │  │   External     │
│   Database     │    │  (Cache + Queue)   │  │    APIs        │
│                │    │                    │  │                │
│ • Users        │    │ • Sessions         │  │ • OpenAI       │
│ • Reports      │    │ • Job Queues       │  │ • X.ai         │
│ • Templates    │    │ • Rate Limiting    │  │ • Webex        │
│ • Schedules    │    │                    │  │                │
└────────────────┘    └────────────────────┘  └────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.1.7 | React framework with SSR/SSG |
| **React** | 19.2.0 | Component-based UI library |
| **TypeScript** | 5.x | Type-safe development |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **TanStack Query** | 5.90.10 | Server state management |
| **React Hook Form** | 7.66.1 | Form state management |
| **Zod** | 4.1.13 | Schema validation |
| **Recharts** | 3.5.0 | Data visualization |
| **Axios** | 1.7.9 | HTTP client |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20 LTS | Runtime environment |
| **Fastify** | 5.6.2 | High-performance web framework |
| **TypeScript** | 5.9.3 | Type-safe backend |
| **Prisma** | 5.22.0 | ORM with type safety |
| **PostgreSQL** | 15 | Primary database |
| **Redis** | 7 | Cache and job queues |
| **OpenAI SDK** | 6.9.1 | LLM and TTS integration |
| **Puppeteer** | 24.31.0 | PDF generation |
| **docx** | 9.5.1 | Word document generation |
| **FFmpeg** | Latest | Audio processing |
| **fluent-ffmpeg** | 2.1.3 | Node.js FFmpeg wrapper |

---

## Service Layer Architecture

### Backend Services Structure

```
backend/src/
├── services/
│   ├── auth.service.ts           # Authentication & JWT
│   ├── user.service.ts            # User CRUD operations
│   ├── llm.service.ts             # LLM API integration
│   ├── report.service.ts          # Report generation orchestration
│   ├── export.service.ts          # PDF/DOCX generation
│   ├── podcast.service.ts         # Podcast generation orchestration
│   ├── tts.service.ts             # Text-to-speech (OpenAI TTS)
│   ├── audio-processor.service.ts # FFmpeg audio processing
│   ├── user-template.service.ts   # Template management
│   ├── schedule.service.ts        # Schedule CRUD
│   ├── schedule-processor.ts      # Background schedule execution
│   ├── webex-delivery.service.ts  # Webex bot integration
│   ├── analytics.service.ts       # Analytics data aggregation
│   ├── admin.service.ts           # Admin configuration
│   └── activity-tracking.service.ts # User activity logging
├── routes/
│   ├── auth.routes.ts             # /api/auth/*
│   ├── users.routes.ts            # /api/users/*
│   ├── reports.routes.ts          # /api/reports/*
│   ├── podcast.routes.ts          # /api/podcasts/*
│   ├── templates.routes.ts        # /api/templates/*
│   ├── schedules.routes.ts        # /api/schedules/*
│   └── analytics.routes.ts        # /api/analytics/*
├── middleware/
│   ├── auth.middleware.ts         # JWT verification
│   ├── rate-limit.middleware.ts   # Rate limiting
│   └── error-handler.middleware.ts # Global error handling
└── utils/
    ├── llm-providers.ts           # LLM provider abstraction
    ├── encryption.ts              # AES-256 encryption
    └── validation.ts              # Input validation
```

### Key Services

#### 1. LLM Service (`llm.service.ts`)

**Purpose**: Unified interface for multiple LLM providers

**Features**:
- Provider abstraction (OpenAI, X.ai)
- Automatic failover
- Token counting and cost estimation
- Request/response logging

**Methods**:
- `chat(messages, options)`: General chat completion
- `generateSection(prompt, context)`: Report section generation
- `enrichCompanyData(company)`: Data enrichment

#### 2. Report Service (`report.service.ts`)

**Purpose**: Orchestrate multi-section report generation

**Workflow**:
1. Validate input data
2. Enrich company information (LLM)
3. Generate each selected section in parallel
4. Compile sections into report
5. Trigger export (PDF/DOCX)
6. Optionally trigger podcast generation

#### 3. Podcast Service (`podcast.service.ts`)

**Purpose**: Generate AI podcast from report content

**Pipeline**:
1. **Script Generation**:
   - Convert report to dialogue format
   - Use template-specific prompts
   - Generate host personalities
2. **Text-to-Speech**:
   - Convert each dialogue segment
   - Use appropriate voice per host
   - Generate audio segments
3. **Audio Processing**:
   - Concatenate segments
   - Add pauses between speakers
   - Mix background music
   - Normalize audio levels
   - Export as MP3

#### 4. Export Service (`export.service.ts`)

**Purpose**: Generate PDF and Word documents

**PDF Generation** (Puppeteer):
- Render HTML template
- Apply CSS styling
- Generate professional PDF
- Includes cover page, TOC, sections

**Word Generation** (docx):
- Programmatic document creation
- Professional styling
- Headers, footers, page numbers
- Embedded hyperlinks

---

## Database Schema

### Core Models

#### User & Authentication

```prisma
model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String
  role          UserRole       @default(USER)
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  profile       UserProfile?
  reports       Report[]
  templates     Template[]
  schedules     Schedule[]
}

enum UserRole {
  USER
  ADMIN
}

model UserProfile {
  id            String    @id @default(uuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id])
  fullName      String?
  timezone      String    @default("UTC")
  preferences   Json?
}
```

#### Report System

```prisma
model Report {
  id              String           @id @default(uuid())
  userId          String
  user            User             @relation(fields: [userId], references: [id])

  title           String
  workflowType    WorkflowType
  configuration   Json
  inputData       Json

  content         Json?
  status          ReportStatus     @default(PENDING)
  format          ReportFormat[]

  createdAt       DateTime         @default(now())
  completedAt     DateTime?

  exports         DocumentExport[]
  podcast         PodcastGeneration?
  deliveries      ReportDelivery[]
}

enum WorkflowType {
  ACCOUNT_INTELLIGENCE
  COMPETITIVE_INTELLIGENCE
  NEWS_DIGEST
}

enum ReportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum ReportFormat {
  PDF
  DOCX
  PODCAST
}
```

#### Podcast System

```prisma
model PodcastGeneration {
  id                String          @id @default(uuid())
  reportId          String          @unique
  report            Report          @relation(fields: [reportId], references: [id])

  template          PodcastTemplate
  duration          PodcastDuration

  script            Json?
  audioSegments     Json?
  finalAudioPath    String?

  status            PodcastStatus   @default(PENDING)
  durationSeconds   Int?
  fileSizeBytes     BigInt?

  createdAt         DateTime        @default(now())
  completedAt       DateTime?
}

enum PodcastTemplate {
  EXECUTIVE_BRIEF
  STRATEGIC_DEBATE
  INDUSTRY_PULSE
}

enum PodcastDuration {
  SHORT     // 5 minutes
  STANDARD  // 10-15 minutes
  LONG      // 15-20 minutes
}

model PodcastHost {
  id              String    @id @default(uuid())
  name            String
  role            String    // 'host', 'analyst', 'expert'
  personality     String    // 'analytical', 'enthusiastic'
  voiceId         String    // OpenAI voice: 'alloy', 'echo', etc.
  voiceProvider   String    @default("openai")
  isActive        Boolean   @default(true)
}
```

#### Templates & Scheduling

```prisma
model Template {
  id              String       @id @default(uuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id])

  name            String
  description     String?
  workflowType    WorkflowType
  configuration   Json

  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())

  schedules       Schedule[]
}

model Schedule {
  id              String         @id @default(uuid())
  userId          String
  user            User           @relation(fields: [userId], references: [id])

  name            String
  description     String?

  templateId      String?
  template        Template?      @relation(fields: [templateId], references: [id])

  cronExpression  String
  timezone        String         @default("UTC")

  isActive        Boolean        @default(true)
  lastRunAt       DateTime?
  nextRunAt       DateTime?

  deliveryMethod  DeliveryMethod?
  deliveryConfig  Json?
}
```

---

## Authentication Flow

### Registration

```
User → Frontend → POST /api/auth/register
                ↓
          Backend validates input
                ↓
          Hash password (bcrypt, 12 rounds)
                ↓
          Create User + UserProfile
                ↓
          Generate JWT token
                ↓
          Return { user, token }
```

### Login

```
User → Frontend → POST /api/auth/login
                ↓
          Backend finds user by email
                ↓
          Verify password (bcrypt.compare)
                ↓
          Generate JWT token (7 day expiry)
                ↓
          Return { user, token }
```

### Protected Routes

```
Request → Nginx → Backend
              ↓
        auth.middleware.ts
              ↓
        Extract JWT from Authorization header
              ↓
        Verify JWT signature
              ↓
        Check expiration
              ↓
        Attach user to request.user
              ↓
        Route handler
```

---

## Report Generation Pipeline

### Account Intelligence Flow

```
1. User submits request
   ├── Company name
   ├── Selected sections
   ├── Depth preference
   └── Output formats

2. Create Report record (status: PENDING)

3. Enrich company data (LLM)
   └── Return: industry, size, headquarters, description

4. Generate sections in parallel
   ├── account_overview → LLM prompt
   ├── financial_health → LLM prompt
   ├── security_events → LLM prompt
   └── current_events → LLM prompt

5. Compile report content
   └── Combine sections with metadata

6. Update Report (status: COMPLETED)

7. Export formats (background)
   ├── PDF → Puppeteer
   ├── DOCX → docx library
   └── PODCAST → Podcast service (if selected)

8. Deliver (if configured)
   └── Webex bot sends files
```

### Generation Times

- **Brief, 2 sections**: ~1 minute
- **Standard, 4 sections**: ~2-3 minutes
- **Detailed, 4 sections**: ~4-6 minutes
- **Podcast addition**: +3-12 minutes

---

## Podcast Generation Pipeline

### Detailed Workflow

```
1. Input: Completed Report

2. Script Generation Phase
   ├── Select template (EXECUTIVE_BRIEF, STRATEGIC_DEBATE, INDUSTRY_PULSE)
   ├── Load host configurations for template
   ├── Generate LLM prompt with:
   │   ├── Report content
   │   ├── Host personalities
   │   ├── Target duration
   │   └── Conversation structure
   └── LLM generates dialogue JSON:
       {
         "segments": [
           {"speaker": "Host", "text": "...", "voice": "alloy"},
           {"speaker": "Expert", "text": "...", "voice": "nova"}
         ]
       }

3. Text-to-Speech Phase
   ├── For each segment:
   │   ├── Call OpenAI TTS API
   │   ├── Voice: segment.voice
   │   ├── Model: tts-1-hd (high quality)
   │   ├── Speed: 1.0
   │   └── Save as WAV file
   └── Store all segment paths

4. Audio Processing Phase
   ├── FFmpeg operations:
   │   ├── Add 0.5s pause between segments
   │   ├── Concatenate all segments
   │   ├── Normalize audio levels
   │   ├── Mix background music (subtle)
   │   └── Export as MP3 (192 kbps)
   └── Calculate final duration and file size

5. Finalize
   ├── Update PodcastGeneration record
   ├── Status: COMPLETED
   ├── Store finalAudioPath
   └── Cleanup temporary files
```

### Audio Quality Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| TTS Model | tts-1-hd | High quality voices |
| Sample Rate | 24 kHz | Professional audio |
| MP3 Bitrate | 192 kbps | Balance quality/size |
| Pause Duration | 500ms | Natural conversation flow |
| Background Music | -20dB | Subtle, non-intrusive |

---

## API Endpoints

### Authentication

```
POST   /api/auth/register         # Create new user
POST   /api/auth/login            # Login with email/password
POST   /api/auth/refresh          # Refresh JWT token
POST   /api/auth/change-password  # Change user password
GET    /api/auth/me               # Get current user info
```

### Reports

```
POST   /api/reports               # Create new report
GET    /api/reports               # List user's reports
GET    /api/reports/:id           # Get report details
DELETE /api/reports/:id           # Delete report
POST   /api/reports/:id/regenerate # Regenerate report
GET    /api/reports/:id/export    # Download PDF/DOCX
```

### Podcasts

```
POST   /api/reports/:id/podcast           # Generate podcast
GET    /api/reports/:id/podcast/status    # Check generation status
GET    /api/reports/:id/podcast/download  # Download MP3
GET    /api/reports/:id/podcast/stream    # Stream audio
GET    /api/reports/:id/podcast/script    # View script
```

### Templates

```
GET    /api/templates             # List user templates
POST   /api/templates             # Create template
GET    /api/templates/:id         # Get template details
PUT    /api/templates/:id         # Update template
DELETE /api/templates/:id         # Delete template
```

### Schedules

```
GET    /api/schedules             # List user schedules
POST   /api/schedules             # Create schedule
GET    /api/schedules/:id         # Get schedule details
PUT    /api/schedules/:id         # Update schedule
DELETE /api/schedules/:id         # Delete schedule
POST   /api/schedules/:id/pause   # Pause schedule
POST   /api/schedules/:id/resume  # Resume schedule
```

### Admin

```
GET    /api/admin/config          # Get system configuration
PUT    /api/admin/config          # Update system configuration
POST   /api/admin/config/test     # Test LLM/Webex connection

GET    /api/users                 # List all users (admin)
POST   /api/users                 # Create user (admin)
PUT    /api/users/:id             # Update user (admin)
DELETE /api/users/:id             # Delete user (admin)

GET    /api/analytics             # System analytics
GET    /api/analytics/users       # User activity stats
GET    /api/analytics/reports     # Report generation stats
```

---

## Performance Considerations

### Caching Strategy

- **Redis Cache**: LLM enrichment data (24 hours)
- **Query Result Cache**: Analytics aggregations (5 minutes)
- **Static Assets**: CDN caching (1 year)

### Background Jobs

- **Report Generation**: Queued via Redis
- **Podcast Generation**: Queued via Redis (longer timeout)
- **Schedule Processing**: Polls every minute
- **Cleanup Jobs**: Daily at off-peak hours

### Scalability

**Horizontal Scaling**:
- Frontend: Multiple Next.js instances behind Nginx
- Backend: Multiple Fastify instances with Redis session sharing
- Database: PostgreSQL read replicas

**Vertical Scaling**:
- Increase backend memory for podcast generation
- Add CPU cores for parallel report generation

---

## Security Architecture

### Data Protection

- **Passwords**: bcrypt hashing (12 rounds)
- **Sensitive Config**: AES-256-GCM encryption
- **API Keys**: Encrypted at rest in database
- **JWT Tokens**: HS256 signing, 7-day expiry

### Network Security

- **HTTPS**: TLS 1.2+ enforced
- **CORS**: Configured for frontend domain only
- **Rate Limiting**: API endpoint protection
- **Headers**: Helmet.js security headers

### Access Control

- **Role-Based**: USER vs ADMIN roles
- **Resource Ownership**: Users can only access own resources
- **Admin Routes**: Require ADMIN role

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0

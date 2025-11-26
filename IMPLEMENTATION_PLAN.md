# IIoT Account Intelligence Application - Implementation Plan

## Executive Summary

This document outlines the comprehensive implementation plan for the IIoT Account Intelligence application, a modern web-based platform that leverages AI to provide account intelligence, competitive intelligence, and automated news digests. The application features a clean, modern interface with robust report generation capabilities, scheduling, and integration with enterprise tools.

### Key Features
- AI-powered account intelligence reports with customizable sections
- Competitive intelligence focused on Cisco IIoT portfolio
- Multi-customer news digest generation
- Template and schedule management
- PDF and Word report generation with professional formatting
- Webex bot integration for report delivery
- Secure authentication and role-based access control

---

## 1. Requirements Overview

### 1.1 Core Requirements

**Primary Functionality:**
- Account Intelligence workflow with customizable report sections
- Competitive Intelligence workflow from Cisco IIoT perspective
- News Digest workflow for multi-customer summaries

**User Management:**
- Email/password authentication with auto-enrollment option
- Two-tier role system (Admin and Regular Users)
- User profiles with saved preferences and templates

**Report Generation:**
- Professional PDF and Word output formats
- Rich formatting support (graphics, tables, titles, hyperlinks)
- Download and Webex bot delivery options
- LLM-powered content generation using X.ai and OpenAI APIs

**Template & Scheduling:**
- Save report configurations as reusable templates
- Recurring schedule support for automated report generation
- Template management interface
- Schedule management interface

**Data Input:**
- Manual text input for single accounts
- Bulk paste for multiple accounts
- CSV upload for batch processing
- LLM-based validation and enrichment

**Administrative:**
- Admin dashboard for user management
- API key and Webex token configuration
- Default LLM model configuration
- Report retention policy settings
- Report analytics dashboard

**Security:**
- HTTPS/TLS encryption
- Secure API key and token storage
- Password hashing and secure session management

### 1.2 Technical Requirements

- Self-hosted/on-premises deployment
- Modern, responsive web interface
- Scalable architecture for future enhancements
- Comprehensive error handling and logging
- Support for multiple concurrent users
- Time zone awareness for scheduling

---

## 2. Technology Stack

### 2.1 Frontend Stack

**Core Framework:**
- **React 18+**: Component-based UI library
- **Next.js 14+**: React framework with SSR, routing, and API routes
- **TypeScript**: Type-safe development

**UI & Styling:**
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: High-quality, accessible component library
- **Radix UI**: Unstyled, accessible component primitives
- **Lucide React**: Modern icon library

**State Management:**
- **React Context + Hooks**: For local state
- **TanStack Query (React Query)**: Server state management and caching
- **Zustand**: Lightweight global state (if needed)

**Forms & Validation:**
- **React Hook Form**: Performant form management
- **Zod**: TypeScript-first schema validation

**Data Visualization:**
- **Recharts**: For analytics dashboard
- **React-PDF**: PDF preview capabilities

### 2.2 Backend Stack

**Core Framework:**
- **Node.js 20 LTS**: Runtime environment
- **Fastify**: Fast, low-overhead web framework
- **TypeScript**: Type-safe backend development

**Database & ORM:**
- **PostgreSQL 15+**: Primary database
- **Prisma**: Next-generation ORM with type safety
- **Redis** (optional): Caching and session storage

**Authentication:**
- **bcrypt**: Password hashing
- **jsonwebtoken (JWT)**: Stateless authentication
- **express-rate-limit**: Rate limiting for API endpoints

**LLM Integration:**
- **OpenAI SDK**: OpenAI API client
- **X.ai SDK**: X.ai API client
- Custom abstraction layer for model switching

**Report Generation:**
- **Puppeteer**: PDF generation with HTML/CSS
- **docx**: Microsoft Word document generation
- **Handlebars**: Template engine for report layouts

**Job Scheduling:**
- **node-cron**: Cron-like job scheduler
- **Bull** or **BullMQ**: Robust job queue with Redis (if needed for scale)

**File Storage:**
- **Local filesystem**: For on-prem deployment
- **Sharp**: Image processing and optimization

**Webex Integration:**
- **@webex/node-bot-sdk**: Webex bot integration

**Additional Libraries:**
- **csv-parse**: CSV file parsing
- **Winston**: Structured logging
- **Joi** or **Zod**: Request validation
- **helmet**: Security headers
- **cors**: CORS handling

### 2.3 Development & Deployment

**Development Tools:**
- **Docker**: Containerization for consistent environments
- **Docker Compose**: Multi-container orchestration
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Jest**: Unit and integration testing
- **Playwright**: End-to-end testing

**Deployment:**
- **Docker containers**: Application packaging
- **Nginx**: Reverse proxy and static file serving
- **Let's Encrypt**: SSL certificate management
- **PM2**: Process management (alternative to Docker)

**CI/CD:**
- **GitHub Actions** or **GitLab CI**: Automated testing and deployment

---

## 3. System Architecture

### 3.1 High-Level Architecture

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
│                    (TLS Termination)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                   Application Layer                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Next.js Frontend (Port 3000)               │     │
│  │  • UI Components  • Client-side routing            │     │
│  │  • Server-side rendering  • API integration        │     │
│  └───────────────────────┬────────────────────────────┘     │
│                          │                                   │
│  ┌───────────────────────▼────────────────────────────┐     │
│  │         Fastify Backend API (Port 3001)            │     │
│  │                                                     │     │
│  │  ┌──────────────┐  ┌──────────────┐               │     │
│  │  │ Auth Service │  │ User Service │               │     │
│  │  └──────────────┘  └──────────────┘               │     │
│  │  ┌──────────────┐  ┌──────────────┐               │     │
│  │  │Report Service│  │  LLM Service │               │     │
│  │  └──────────────┘  └──────────────┘               │     │
│  │  ┌──────────────┐  ┌──────────────┐               │     │
│  │  │Template Svc  │  │Schedule Svc  │               │     │
│  │  └──────────────┘  └──────────────┘               │     │
│  │  ┌──────────────┐  ┌──────────────┐               │     │
│  │  │ Webex Service│  │Analytics Svc │               │     │
│  │  └──────────────┘  └──────────────┘               │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────┬────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ PostgreSQL │  │   Redis    │  │   Local    │            │
│  │  Database  │  │  (Cache)   │  │   Files    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  OpenAI    │  │   X.ai     │  │   Webex    │            │
│  │    API     │  │    API     │  │    API     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                 Background Jobs                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Scheduled  │  │  Report    │  │  Cleanup   │            │
│  │  Reports   │  │ Generation │  │   Jobs     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Component Architecture

**Frontend Architecture (Next.js):**
```
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── layout.tsx
├── (dashboard)/
│   ├── layout.tsx                 # Main dashboard layout
│   ├── page.tsx                   # Dashboard home
│   ├── account-intelligence/
│   │   ├── page.tsx               # Account intelligence workflow
│   │   └── [reportId]/
│   │       └── page.tsx           # View specific report
│   ├── competitive-intelligence/
│   │   └── page.tsx               # Competitive intelligence workflow
│   ├── news-digest/
│   │   └── page.tsx               # News digest workflow
│   ├── templates/
│   │   ├── page.tsx               # Template management
│   │   └── [templateId]/
│   │       └── page.tsx           # Edit template
│   ├── schedules/
│   │   ├── page.tsx               # Schedule management
│   │   └── [scheduleId]/
│   │       └── page.tsx           # Edit schedule
│   ├── reports/
│   │   ├── page.tsx               # Report history
│   │   └── [reportId]/
│   │       └── page.tsx           # View report
│   ├── analytics/
│   │   └── page.tsx               # Analytics dashboard
│   └── profile/
│       └── page.tsx               # User profile
├── (admin)/
│   ├── layout.tsx
│   ├── users/
│   │   └── page.tsx               # User management
│   ├── settings/
│   │   └── page.tsx               # System settings (API keys, etc.)
│   └── analytics/
│       └── page.tsx               # System-wide analytics
└── api/
    └── [...]/                     # API routes if needed

components/
├── ui/                            # Shadcn/ui components
├── forms/
│   ├── AccountInputForm.tsx
│   ├── ReportConfigForm.tsx
│   ├── TemplateForm.tsx
│   └── ScheduleForm.tsx
├── reports/
│   ├── ReportPreview.tsx
│   ├── ReportSectionSelector.tsx
│   └── ReportFormatSelector.tsx
├── layout/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── Footer.tsx
└── analytics/
    ├── ReportChart.tsx
    └── UsageStats.tsx

lib/
├── api.ts                         # API client
├── auth.ts                        # Auth utilities
├── constants.ts
├── types.ts
└── utils.ts

hooks/
├── useAuth.ts
├── useReports.ts
├── useTemplates.ts
└── useSchedules.ts
```

**Backend Architecture (Fastify):**
```
src/
├── index.ts                       # Application entry point
├── app.ts                         # Fastify app setup
├── config/
│   ├── database.ts                # Database configuration
│   ├── env.ts                     # Environment variables
│   └── llm.ts                     # LLM configuration
├── routes/
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── report.routes.ts
│   ├── template.routes.ts
│   ├── schedule.routes.ts
│   ├── admin.routes.ts
│   └── analytics.routes.ts
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── report.controller.ts
│   ├── template.controller.ts
│   ├── schedule.controller.ts
│   ├── admin.controller.ts
│   └── analytics.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── report.service.ts
│   ├── llm.service.ts             # LLM abstraction layer
│   │   ├── openai.provider.ts
│   │   └── xai.provider.ts
│   ├── enrichment.service.ts      # Data enrichment logic
│   ├── template.service.ts
│   ├── schedule.service.ts
│   ├── document.service.ts        # PDF/Word generation
│   ├── webex.service.ts
│   ├── analytics.service.ts
│   └── storage.service.ts         # File storage
├── jobs/
│   ├── scheduler.ts               # Job scheduler setup
│   ├── scheduled-reports.job.ts
│   └── cleanup.job.ts             # Cleanup old reports
├── middleware/
│   ├── auth.middleware.ts
│   ├── admin.middleware.ts
│   ├── error.middleware.ts
│   ├── validation.middleware.ts
│   └── rate-limit.middleware.ts
├── validators/
│   ├── auth.validator.ts
│   ├── report.validator.ts
│   ├── template.validator.ts
│   └── schedule.validator.ts
├── models/                        # Prisma client & types
│   └── index.ts
├── utils/
│   ├── logger.ts
│   ├── crypto.ts
│   ├── date.ts
│   └── helpers.ts
└── types/
    ├── index.ts
    ├── report.types.ts
    ├── llm.types.ts
    └── api.types.ts

prisma/
├── schema.prisma                  # Database schema
├── migrations/
└── seed.ts                        # Database seeding

tests/
├── unit/
├── integration/
└── e2e/
```

---

## 4. Data Models

### 4.1 Database Schema (Prisma)

```prisma
// User Management
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  firstName     String?
  lastName      String?
  role          UserRole  @default(USER)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  profile       UserProfile?
  reports       Report[]
  templates     Template[]
  schedules     Schedule[]

  @@index([email])
}

enum UserRole {
  ADMIN
  USER
}

model UserProfile {
  id                String   @id @default(uuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  defaultLLMModel   String?  // "gpt-4", "grok-2", etc.
  timezone          String   @default("UTC")
  preferences       Json?    // Additional user preferences

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// Template Management
model Template {
  id              String         @id @default(uuid())
  userId          String
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  name            String
  description     String?
  workflowType    WorkflowType
  configuration   Json           // Report configuration

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  schedules       Schedule[]

  @@index([userId])
  @@index([workflowType])
}

enum WorkflowType {
  ACCOUNT_INTELLIGENCE
  COMPETITIVE_INTELLIGENCE
  NEWS_DIGEST
}

// Report Management
model Report {
  id              String         @id @default(uuid())
  userId          String
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  title           String
  workflowType    WorkflowType
  configuration   Json           // Report configuration used
  inputData       Json           // User input data
  enrichedData    Json?          // LLM-enriched data

  status          ReportStatus   @default(PENDING)
  llmModel        String
  generatedContent Json?         // Report content

  format          ReportFormat[]
  filePaths       Json?          // Paths to generated files

  error           String?

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  completedAt     DateTime?

  scheduleId      String?
  schedule        Schedule?      @relation(fields: [scheduleId], references: [id], onDelete: SetNull)

  deliveries      ReportDelivery[]

  @@index([userId])
  @@index([workflowType])
  @@index([status])
  @@index([createdAt])
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
}

model ReportDelivery {
  id              String           @id @default(uuid())
  reportId        String
  report          Report           @relation(fields: [reportId], references: [id], onDelete: Cascade)

  method          DeliveryMethod
  destination     String           // email, webex room ID, etc.
  status          DeliveryStatus   @default(PENDING)
  error           String?

  createdAt       DateTime         @default(now())
  deliveredAt     DateTime?

  @@index([reportId])
}

enum DeliveryMethod {
  DOWNLOAD
  WEBEX
}

enum DeliveryStatus {
  PENDING
  SENT
  FAILED
}

// Schedule Management
model Schedule {
  id              String         @id @default(uuid())
  userId          String
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  name            String
  description     String?

  templateId      String
  template        Template       @relation(fields: [templateId], references: [id], onDelete: Cascade)

  cronExpression  String         // Cron format for scheduling
  timezone        String         @default("UTC")

  isActive        Boolean        @default(true)

  deliveryMethod  DeliveryMethod
  deliveryDestination String?

  lastRunAt       DateTime?
  nextRunAt       DateTime?

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  reports         Report[]

  @@index([userId])
  @@index([isActive])
  @@index([nextRunAt])
}

// System Configuration
model SystemConfig {
  id              String   @id @default(uuid())
  key             String   @unique
  value           String   // Encrypted for sensitive values
  isEncrypted     Boolean  @default(false)
  description     String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([key])
}

// Analytics
model ReportAnalytics {
  id              String       @id @default(uuid())
  date            DateTime     @db.Date
  workflowType    WorkflowType

  totalGenerated  Int          @default(0)
  totalFailed     Int          @default(0)
  avgDuration     Int?         // in seconds

  @@unique([date, workflowType])
  @@index([date])
}

model UserActivity {
  id              String   @id @default(uuid())
  userId          String
  action          String
  details         Json?
  ipAddress       String?
  userAgent       String?

  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

### 4.2 Key Data Types

**Report Configuration:**
```typescript
interface AccountIntelligenceConfig {
  workflowType: 'ACCOUNT_INTELLIGENCE';
  sections: {
    accountOverview: boolean;
    financialHealth: boolean;
    securityEvents: boolean;
    currentEvents: boolean;
    marketPosition?: boolean;
    keyContacts?: boolean;
    // Extensible for future sections
  };
  accountInput: {
    accounts: Array<{
      name: string;
      enrichedData?: any;
    }>;
  };
}

interface CompetitiveIntelligenceConfig {
  workflowType: 'COMPETITIVE_INTELLIGENCE';
  targetCompany: string;
  focusAreas: string[];
  ciscoProducts: string[];
}

interface NewsDigestConfig {
  workflowType: 'NEWS_DIGEST';
  accounts: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}
```

---

## 5. API Design

### 5.1 Authentication Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/change-password
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### 5.2 User Endpoints

```
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/preferences
PUT    /api/users/preferences
```

### 5.3 Report Endpoints

```
POST   /api/reports                    # Create new report
GET    /api/reports                    # List user's reports
GET    /api/reports/:id                # Get report details
DELETE /api/reports/:id                # Delete report
GET    /api/reports/:id/download       # Download report file
POST   /api/reports/:id/deliver        # Deliver via Webex

# Data enrichment
POST   /api/reports/enrich             # Enrich account data
POST   /api/reports/validate           # Validate input data
POST   /api/reports/parse-csv          # Parse CSV file
```

### 5.4 Template Endpoints

```
POST   /api/templates                  # Create template
GET    /api/templates                  # List user's templates
GET    /api/templates/:id              # Get template details
PUT    /api/templates/:id              # Update template
DELETE /api/templates/:id              # Delete template
```

### 5.5 Schedule Endpoints

```
POST   /api/schedules                  # Create schedule
GET    /api/schedules                  # List user's schedules
GET    /api/schedules/:id              # Get schedule details
PUT    /api/schedules/:id              # Update schedule
DELETE /api/schedules/:id              # Delete schedule
POST   /api/schedules/:id/activate     # Activate schedule
POST   /api/schedules/:id/deactivate   # Deactivate schedule
POST   /api/schedules/:id/run-now      # Trigger immediate run
```

### 5.6 Analytics Endpoints

```
GET    /api/analytics/reports          # Report generation stats
GET    /api/analytics/usage            # User usage statistics
GET    /api/analytics/popular-templates # Most used templates
```

### 5.7 Admin Endpoints

```
# User Management
GET    /api/admin/users                # List all users
POST   /api/admin/users                # Create user
PUT    /api/admin/users/:id            # Update user
DELETE /api/admin/users/:id            # Delete user
POST   /api/admin/users/:id/activate   # Activate user
POST   /api/admin/users/:id/deactivate # Deactivate user

# System Configuration
GET    /api/admin/config               # Get system config
PUT    /api/admin/config               # Update system config
POST   /api/admin/config/test-llm      # Test LLM connection
POST   /api/admin/config/test-webex    # Test Webex connection

# System Analytics
GET    /api/admin/analytics/system     # System-wide analytics
GET    /api/admin/analytics/users      # User activity analytics
```

### 5.8 API Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

**Pagination:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation & Core Infrastructure (Weeks 1-2)

**Objectives:**
- Set up development environment and project structure
- Implement authentication and user management
- Create basic UI framework

**Tasks:**

**Week 1:**
- [ ] Initialize project repositories (frontend and backend)
- [ ] Set up Docker development environment
- [ ] Configure PostgreSQL database
- [ ] Set up Prisma ORM and initial schema
- [ ] Implement backend API structure (Fastify)
- [ ] Set up Next.js frontend project structure
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Set up logging and error handling
- [ ] Create environment configuration management

**Week 2:**
- [ ] Implement authentication system
  - [ ] Email/password registration
  - [ ] Login with JWT tokens
  - [ ] Password hashing with bcrypt
  - [ ] Session management
  - [ ] Password reset functionality
- [ ] Create user profile management
- [ ] Implement role-based access control (Admin/User)
- [ ] Build basic UI layout
  - [ ] Header with navigation
  - [ ] Sidebar menu
  - [ ] Responsive layout
  - [ ] Login/register pages
  - [ ] Dashboard home page
- [ ] Set up Shadcn/ui component library

**Deliverables:**
- Working authentication system
- Basic application shell with navigation
- Database schema initialized
- Development environment documented

---

### Phase 2: LLM Integration & Data Enrichment (Weeks 3-4)

**Objectives:**
- Integrate OpenAI and X.ai APIs
- Build data enrichment pipeline
- Create admin configuration interface

**Tasks:**

**Week 3:**
- [ ] Create LLM service abstraction layer
- [ ] Implement OpenAI provider
  - [ ] GPT-4 integration
  - [ ] Prompt engineering for account enrichment
  - [ ] Error handling and retries
- [ ] Implement X.ai provider
  - [ ] Grok-2 integration
  - [ ] Consistent interface with OpenAI
- [ ] Build model selection and routing logic
- [ ] Implement rate limiting for LLM calls
- [ ] Create LLM response caching strategy

**Week 4:**
- [ ] Build data enrichment service
  - [ ] Account validation
  - [ ] Company information enrichment
  - [ ] Financial data extraction
  - [ ] News and events gathering
- [ ] Implement CSV parsing and batch processing
- [ ] Create bulk account input handler
- [ ] Build admin configuration page
  - [ ] API key management (encrypted storage)
  - [ ] Default LLM model selection
  - [ ] Webex token configuration
  - [ ] Test connections functionality
- [ ] Create system configuration database table
- [ ] Implement secure credential storage

**Deliverables:**
- Working LLM integration with both providers
- Data enrichment pipeline
- Admin configuration interface
- Secure API key storage

---

### Phase 3: Report Generation Engine (Weeks 5-6)

**Objectives:**
- Build core report generation functionality
- Implement PDF and Word document generation
- Create report templates and formatting

**Tasks:**

**Week 5:**
- [ ] Design report data structure
- [ ] Create report service layer
- [ ] Implement report generation workflow
  - [ ] Status tracking (pending, processing, completed, failed)
  - [ ] Error handling and recovery
- [ ] Build report template engine
  - [ ] Handlebars templates for report sections
  - [ ] Professional styling and layout
  - [ ] Support for tables, charts, images
  - [ ] Hyperlink formatting
- [ ] Create report content generation logic
  - [ ] Section-based content assembly
  - [ ] LLM prompt engineering for each section
  - [ ] Content formatting and validation

**Week 6:**
- [ ] Implement PDF generation
  - [ ] Puppeteer setup for HTML to PDF
  - [ ] Professional PDF styling
  - [ ] Header/footer templates
  - [ ] Page numbering
  - [ ] Table of contents
- [ ] Implement Word document generation
  - [ ] docx library integration
  - [ ] Styling and formatting
  - [ ] Tables and images support
- [ ] Create report preview functionality
- [ ] Implement file storage service
- [ ] Build report download endpoints
- [ ] Create report status polling mechanism

**Deliverables:**
- Working report generation engine
- Professional PDF and Word output
- Report preview and download functionality

---

### Phase 4: Account Intelligence Workflow (Weeks 7-8)

**Objectives:**
- Build Account Intelligence workflow UI
- Implement customizable report sections
- Create end-to-end report generation

**Tasks:**

**Week 7:**
- [ ] Design Account Intelligence UI
- [ ] Create account input form
  - [ ] Single account input
  - [ ] Bulk text paste
  - [ ] CSV file upload
- [ ] Build section selector component
  - [ ] Account Overview
  - [ ] Financial Health
  - [ ] Security Events
  - [ ] Current Events
  - [ ] Additional sections (extensible)
- [ ] Implement format selector (PDF/Word)
- [ ] Create report configuration form
- [ ] Build real-time validation

**Week 8:**
- [ ] Implement Account Intelligence report logic
- [ ] Create prompts for each section type
  - [ ] Account Overview prompt
  - [ ] Financial Health analysis prompt
  - [ ] Security Events search and summary prompt
  - [ ] Current Events news gathering prompt
- [ ] Build section content generation
- [ ] Implement progress tracking UI
- [ ] Create report preview page
- [ ] Build report history list
- [ ] Implement report detail view
- [ ] Add report deletion functionality

**Deliverables:**
- Complete Account Intelligence workflow
- Working UI for account input and configuration
- Generated reports with multiple sections
- Report history and management

---

### Phase 5: Competitive Intelligence Workflow (Week 9)

**Objectives:**
- Build Competitive Intelligence workflow
- Implement Cisco IIoT focused analysis

**Tasks:**

- [ ] Design Competitive Intelligence UI
- [ ] Create company input form
- [ ] Build focus area selection
- [ ] Implement Cisco IIoT product selector
- [ ] Create Competitive Intelligence prompts
  - [ ] Market position analysis
  - [ ] Product comparison
  - [ ] Competitive advantages/disadvantages
  - [ ] Cisco IIoT fit analysis
- [ ] Build competitive analysis report template
- [ ] Implement report generation workflow
- [ ] Test and refine output quality

**Deliverables:**
- Complete Competitive Intelligence workflow
- Cisco IIoT focused competitive reports

---

### Phase 6: News Digest Workflow (Week 10)

**Objectives:**
- Build News Digest workflow
- Implement multi-customer news aggregation

**Tasks:**

- [ ] Design News Digest UI
- [ ] Create multi-account input form
- [ ] Implement date range selector
- [ ] Build News Digest generation logic
  - [ ] News gathering for multiple accounts
  - [ ] Event summarization
  - [ ] Narrative formatting
- [ ] Create News Digest report template
  - [ ] One-page format
  - [ ] News article style
  - [ ] Clear account separation
- [ ] Implement report generation workflow
- [ ] Test with multiple accounts

**Deliverables:**
- Complete News Digest workflow
- Multi-customer news reports in narrative format

---

### Phase 7: Templates & Scheduling (Weeks 11-12)

**Objectives:**
- Implement template management
- Build scheduling system
- Create job queue and execution

**Tasks:**

**Week 11:**
- [ ] Design template management UI
- [ ] Create template save functionality
  - [ ] Capture workflow configuration
  - [ ] Template naming and description
  - [ ] Template preview
- [ ] Build template list view
- [ ] Implement template edit functionality
- [ ] Add template deletion
- [ ] Create template application to new reports
- [ ] Build template detail view

**Week 12:**
- [ ] Design schedule management UI
- [ ] Implement schedule creation form
  - [ ] Template selection
  - [ ] Cron expression builder
  - [ ] Timezone selector
  - [ ] Delivery method selection
- [ ] Build schedule list view
- [ ] Create schedule edit functionality
- [ ] Implement schedule activation/deactivation
- [ ] Add "run now" functionality
- [ ] Set up job scheduler (node-cron or Bull)
- [ ] Implement scheduled report execution
- [ ] Build schedule status tracking
- [ ] Create next run time calculation
- [ ] Implement schedule history

**Deliverables:**
- Complete template management system
- Working schedule system
- Automated recurring report generation

---

### Phase 8: Webex Integration & Delivery (Week 13)

**Objectives:**
- Integrate Webex bot for report delivery
- Implement delivery tracking

**Tasks:**

- [ ] Set up Webex bot SDK
- [ ] Configure existing bot credentials
- [ ] Implement report delivery service
  - [ ] Room/user ID validation
  - [ ] File upload to Webex
  - [ ] Message formatting
  - [ ] Error handling
- [ ] Create delivery UI components
  - [ ] Destination selector
  - [ ] Delivery confirmation
- [ ] Build delivery status tracking
- [ ] Implement delivery retry logic
- [ ] Add delivery history view
- [ ] Test Webex integration end-to-end

**Deliverables:**
- Working Webex bot integration
- Report delivery via Webex
- Delivery tracking and history

---

### Phase 9: Analytics & Admin Features (Week 14)

**Objectives:**
- Build analytics dashboard
- Implement admin user management
- Create system monitoring

**Tasks:**

- [ ] Design analytics dashboard
- [ ] Implement report analytics
  - [ ] Reports generated over time
  - [ ] Workflow type distribution
  - [ ] Success/failure rates
  - [ ] Average generation time
- [ ] Create usage statistics
  - [ ] User activity metrics
  - [ ] Popular templates
  - [ ] LLM usage tracking
- [ ] Build data visualization components
  - [ ] Charts and graphs (Recharts)
  - [ ] Data tables
- [ ] Implement admin user management
  - [ ] User list view
  - [ ] User creation/editing
  - [ ] User activation/deactivation
- [ ] Create system-wide analytics (admin only)
- [ ] Build audit logging
- [ ] Implement data retention cleanup job

**Deliverables:**
- Analytics dashboard for users and admins
- Admin user management interface
- System monitoring and audit logs

---

### Phase 10: Testing, Polish & Documentation (Weeks 15-16)

**Objectives:**
- Comprehensive testing
- UI polish and refinement
- Complete documentation
- Performance optimization

**Tasks:**

**Week 15:**
- [ ] Write unit tests
  - [ ] Service layer tests
  - [ ] Utility function tests
  - [ ] API endpoint tests
- [ ] Write integration tests
  - [ ] Authentication flow
  - [ ] Report generation pipeline
  - [ ] Template and schedule workflow
- [ ] Write E2E tests
  - [ ] Critical user journeys
  - [ ] Complete workflows
- [ ] Perform security audit
  - [ ] Authentication testing
  - [ ] Authorization testing
  - [ ] Input validation
  - [ ] XSS/CSRF protection
  - [ ] SQL injection prevention
- [ ] Load testing
  - [ ] Concurrent user simulation
  - [ ] Report generation at scale
  - [ ] LLM API rate limiting

**Week 16:**
- [ ] UI/UX refinement
  - [ ] Responsive design testing
  - [ ] Accessibility improvements
  - [ ] Error message clarity
  - [ ] Loading states and feedback
- [ ] Performance optimization
  - [ ] Database query optimization
  - [ ] Frontend bundle optimization
  - [ ] API response time improvement
  - [ ] Caching strategy refinement
- [ ] Create user documentation
  - [ ] User guide
  - [ ] Workflow tutorials
  - [ ] FAQ section
- [ ] Create admin documentation
  - [ ] Installation guide
  - [ ] Configuration guide
  - [ ] Maintenance procedures
- [ ] Create developer documentation
  - [ ] Architecture overview
  - [ ] API documentation
  - [ ] Development setup guide
- [ ] Final bug fixes and polish

**Deliverables:**
- Comprehensive test suite
- Polished, production-ready UI
- Complete documentation
- Performance-optimized application

---

### Phase 11: Deployment & Training (Week 17)

**Objectives:**
- Deploy to production environment
- Configure SSL/HTTPS
- User training and onboarding

**Tasks:**

- [ ] Set up production server(s)
- [ ] Configure PostgreSQL production database
- [ ] Set up Redis (if used)
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificates (Let's Encrypt)
- [ ] Configure firewall and security
- [ ] Deploy application containers
- [ ] Set up backup procedures
- [ ] Configure monitoring and alerting
- [ ] Create deployment runbook
- [ ] Conduct admin training session
- [ ] Conduct user training sessions
- [ ] Create video tutorials
- [ ] Set up support channels

**Deliverables:**
- Production deployment
- HTTPS-secured application
- Trained users and administrators
- Support infrastructure

---

## 7. Security Considerations

### 7.1 Authentication & Authorization

**Implementation:**
- Passwords hashed with bcrypt (cost factor: 12)
- JWT tokens for stateless authentication
- HTTP-only cookies for token storage
- Refresh token rotation
- Rate limiting on auth endpoints (5 attempts per 15 minutes)
- Account lockout after failed attempts
- Strong password requirements
- CSRF protection

**Admin Access:**
- Admin role check middleware on all admin routes
- Audit logging for admin actions
- Separate admin dashboard

### 7.2 Data Protection

**At Rest:**
- Database connection over SSL/TLS
- API keys and tokens encrypted in database (AES-256)
- Sensitive configuration encrypted

**In Transit:**
- HTTPS/TLS 1.3 for all connections
- Secure headers (Helmet.js)
- HSTS enabled

**Data Validation:**
- Input validation on all endpoints (Zod schemas)
- SQL injection prevention (Prisma ORM)
- XSS prevention (Content Security Policy)
- File upload validation and sanitization

### 7.3 API Security

**Rate Limiting:**
- General API: 100 requests per 15 minutes per IP
- Auth endpoints: 5 requests per 15 minutes per IP
- Report generation: 10 per hour per user
- LLM calls: Configurable limits per user/admin

**API Key Management:**
- Encrypted storage in database
- Admin-only access to configuration
- Key rotation capabilities
- Connection testing without exposing keys

### 7.4 Third-Party Integration Security

**LLM APIs:**
- API keys never sent to frontend
- Timeout limits on LLM calls
- Error message sanitization
- Usage monitoring and alerting

**Webex Integration:**
- Bot token encrypted storage
- Token validation before use
- Destination validation
- Message content sanitization

### 7.5 Monitoring & Logging

**Audit Logs:**
- User authentication events
- Admin actions (user management, config changes)
- Report generation and delivery
- Failed authentication attempts
- API errors and exceptions

**Security Monitoring:**
- Failed login tracking
- Unusual activity detection
- API rate limit violations
- LLM usage anomalies

---

## 8. Performance Optimization

### 8.1 Frontend Optimization

- Next.js Server-Side Rendering for initial page loads
- Static page generation where possible
- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Bundle size optimization
- Service Worker for offline capabilities (future)

### 8.2 Backend Optimization

- Database query optimization
  - Proper indexing on frequently queried fields
  - Use of database views for complex queries
  - Connection pooling
- Caching strategy
  - Redis for session storage
  - LLM response caching (when appropriate)
  - Report content caching
- Async/await for I/O operations
- Stream processing for large files
- Background job queue for heavy tasks

### 8.3 Database Optimization

- Proper indexing strategy (defined in schema)
- Database connection pooling (Prisma)
- Pagination for large result sets
- Archived storage for old reports
- Regular vacuum and optimization

### 8.4 LLM Call Optimization

- Prompt caching where applicable
- Batch requests when possible
- Parallel processing for independent sections
- Streaming responses for real-time feedback
- Fallback mechanisms for API failures

---

## 9. Deployment Architecture

### 9.1 Self-Hosted Deployment

**Hardware Requirements:**
- CPU: 4+ cores
- RAM: 16GB+ recommended
- Storage: 100GB+ SSD (depending on report volume)
- Network: Stable internet for LLM API calls

**Software Requirements:**
- Ubuntu 22.04 LTS or similar
- Docker and Docker Compose
- PostgreSQL 15+
- Nginx
- SSL certificate (Let's Encrypt)

### 9.2 Container Architecture

**Docker Compose Services:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=iiot_intelligence
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    volumes:
      - ./backend:/app
      - /app/node_modules
      - report_files:/app/storage
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${API_URL}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  report_files:
```

### 9.3 Nginx Configuration

**nginx.conf:**
```nginx
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:3001;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API routes
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long-running report generation
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # Frontend routes
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # File size limit for CSV uploads
    client_max_body_size 10M;
}
```

### 9.4 Environment Variables

**.env Template:**
```env
# Database
DATABASE_URL="postgresql://user:password@postgres:5432/iiot_intelligence"
DB_USER=iiot_user
DB_PASSWORD=secure_password_here

# Redis
REDIS_URL="redis://redis:6379"

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=7d
REFRESH_TOKEN_EXPIRATION=30d

# API Configuration
API_URL=https://your-domain.com/api
FRONTEND_URL=https://your-domain.com

# LLM API Keys (encrypted in DB, but needed for initial setup)
OPENAI_API_KEY=your_openai_key
XAI_API_KEY=your_xai_key

# Webex
WEBEX_BOT_TOKEN=your_webex_token

# File Storage
STORAGE_PATH=/app/storage/reports
MAX_FILE_SIZE=10485760  # 10MB

# Report Retention
REPORT_RETENTION_DAYS=90

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs

# Email (for password reset, optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASSWORD=smtp_password
EMAIL_FROM=noreply@your-domain.com
```

### 9.5 Backup Strategy

**Database Backups:**
- Daily automated backups via pg_dump
- Retention: 7 daily, 4 weekly, 3 monthly
- Offsite backup storage

**File Backups:**
- Daily backup of report files directory
- Compression for older files
- Retention aligned with report retention policy

**Configuration Backups:**
- Version control for configuration files
- Encrypted backup of environment variables
- Documented restore procedures

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Backend:**
- Service layer tests (LLM, report generation, auth)
- Utility function tests
- Validation schema tests
- Target: 80%+ coverage

**Frontend:**
- Component tests (React Testing Library)
- Hook tests
- Utility function tests
- Target: 70%+ coverage

### 10.2 Integration Tests

- API endpoint tests (Supertest)
- Database integration tests
- LLM provider integration tests (mocked)
- Authentication flow tests
- Report generation pipeline tests

### 10.3 End-to-End Tests

**Playwright Tests:**
- User registration and login flow
- Complete Account Intelligence workflow
- Template creation and usage
- Schedule creation and management
- Admin user management
- Report download functionality

### 10.4 Performance Tests

- Load testing with k6 or Artillery
- Concurrent user simulation
- Report generation stress testing
- Database query performance
- API response time benchmarks

### 10.5 Security Tests

- Authentication and authorization testing
- Input validation testing
- SQL injection attempts
- XSS vulnerability scanning
- CSRF protection verification
- API security testing (OWASP guidelines)

---

## 11. Documentation

### 11.1 User Documentation

- **User Guide**: Complete walkthrough of all features
- **Workflow Tutorials**: Step-by-step guides for each workflow
- **Template Guide**: How to create and manage templates
- **Schedule Guide**: Setting up recurring reports
- **FAQ**: Common questions and troubleshooting

### 11.2 Admin Documentation

- **Installation Guide**: Setup and deployment instructions
- **Configuration Guide**: System configuration and tuning
- **User Management**: Managing users and permissions
- **API Key Management**: LLM and Webex configuration
- **Backup and Restore**: Data protection procedures
- **Troubleshooting**: Common issues and solutions
- **Maintenance**: Regular maintenance tasks

### 11.3 Developer Documentation

- **Architecture Overview**: System design and components
- **API Documentation**: Complete API reference (OpenAPI/Swagger)
- **Database Schema**: Data model documentation
- **Development Setup**: Local development environment
- **Code Style Guide**: Coding standards and conventions
- **Contributing Guide**: How to contribute to the project
- **Testing Guide**: Running and writing tests

---

## 12. Future Enhancements (Post-Launch)

### 12.1 Phase 2 Features

**Enhanced Analytics:**
- Cost tracking per report (LLM API costs)
- ROI analysis
- Predictive analytics for account health

**Collaboration:**
- Team workspaces
- Report commenting
- Template sharing within teams

**Additional Integrations:**
- Salesforce CRM integration
- Microsoft Teams bot
- Slack integration
- Email report delivery

**Advanced Reporting:**
- Custom report builder with drag-and-drop
- Chart and graph generation
- Executive summary generation
- Multi-language support

### 12.2 Phase 3 Features

**AI Enhancements:**
- Automated account scoring
- Predictive risk analysis
- Sentiment analysis for news
- Trend detection

**Mobile Support:**
- Native mobile apps (React Native)
- Progressive Web App (PWA)
- Mobile-optimized report viewing

**Enterprise Features:**
- Multi-tenancy support
- SSO/SAML integration
- Advanced access controls
- Custom branding per tenant

**API Platform:**
- Public API for third-party integrations
- Webhooks for event notifications
- API marketplace

---

## 13. Success Metrics

### 13.1 Key Performance Indicators

**User Adoption:**
- Number of registered users
- Active users (daily/weekly/monthly)
- User retention rate

**Usage Metrics:**
- Reports generated per day/week/month
- Average time to generate report
- Report types distribution
- Template usage rate
- Schedule execution success rate

**Quality Metrics:**
- Report generation success rate (target: 95%+)
- Average report generation time (target: <2 minutes)
- LLM API error rate (target: <2%)
- User-reported issues (target: <5 per week)

**System Performance:**
- API response time (target: <500ms for 95th percentile)
- Database query time (target: <100ms for 95th percentile)
- Uptime (target: 99.5%+)

---

## 14. Risk Management

### 14.1 Technical Risks

**Risk: LLM API Outages**
- **Mitigation**: Implement fallback between OpenAI and X.ai, queue failed requests for retry
- **Impact**: Medium
- **Probability**: Low

**Risk: Performance Degradation at Scale**
- **Mitigation**: Load testing, caching strategy, database optimization, horizontal scaling plan
- **Impact**: High
- **Probability**: Medium

**Risk: Data Security Breach**
- **Mitigation**: Security audit, encryption, access controls, monitoring
- **Impact**: Critical
- **Probability**: Low

### 14.2 Project Risks

**Risk: Scope Creep**
- **Mitigation**: Strict phase adherence, clear requirements, change control process
- **Impact**: Medium
- **Probability**: Medium

**Risk: LLM Output Quality Issues**
- **Mitigation**: Extensive prompt engineering, testing, user feedback loop, human review option
- **Impact**: High
- **Probability**: Medium

**Risk: Third-Party API Changes**
- **Mitigation**: Monitor provider changelogs, abstraction layer, version pinning
- **Impact**: Medium
- **Probability**: Low

---

## 15. Conclusion

This implementation plan provides a comprehensive roadmap for building the IIoT Account Intelligence application. The phased approach ensures steady progress with regular deliverables, while the modern architecture ensures extensibility and maintainability.

**Key Strengths:**
- Modern, type-safe technology stack (React, Next.js, Node.js, TypeScript)
- Scalable architecture with clear separation of concerns
- Security-first approach with HTTPS, encryption, and access controls
- Flexible LLM integration supporting multiple providers
- Professional report generation with multiple format support
- Comprehensive testing and documentation strategy

**Timeline Summary:**
- **Weeks 1-2**: Foundation and authentication
- **Weeks 3-4**: LLM integration and data enrichment
- **Weeks 5-6**: Report generation engine
- **Weeks 7-8**: Account Intelligence workflow
- **Week 9**: Competitive Intelligence workflow
- **Week 10**: News Digest workflow
- **Weeks 11-12**: Templates and scheduling
- **Week 13**: Webex integration
- **Week 14**: Analytics and admin features
- **Weeks 15-16**: Testing, polish, and documentation
- **Week 17**: Deployment and training

**Total Estimated Timeline: 17 weeks (approximately 4 months)**

The application will be production-ready with all core features, security measures, and documentation complete. The architecture allows for future enhancements and scaling as the user base grows.

---

## 16. Next Steps

1. **Review and Approval**: Review this implementation plan and provide feedback
2. **Environment Setup**: Provision development and production servers
3. **API Key Acquisition**: Ensure OpenAI and X.ai API keys are ready
4. **Webex Bot Access**: Verify access to existing Webex bot credentials
5. **Kick-off Meeting**: Align on priorities and timeline
6. **Begin Phase 1**: Initialize project structure and development environment

---

**Document Version**: 1.0
**Last Updated**: 2025-11-24
**Status**: Awaiting Review

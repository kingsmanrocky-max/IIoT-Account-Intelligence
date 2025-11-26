# IIoT Account Intelligence Platform

A modern, AI-powered web application for generating comprehensive account intelligence, competitive analysis, and news digests using Large Language Models.

## Overview

The IIoT Account Intelligence Platform is an enterprise-grade application designed to help sales, marketing, and business development teams gather and analyze information about customer accounts and competitors. By leveraging AI technologies from OpenAI and X.ai, the platform automates the research process and generates professional reports in multiple formats.

### Key Features

- **Account Intelligence**: Generate comprehensive reports with customizable sections including company overview, financial health, security events, and current news
- **Competitive Intelligence**: Analyze competitors from the perspective of Cisco's IIoT portfolio with detailed positioning and win strategies
- **News Digest**: Create executive-style news briefs covering multiple accounts in a concise, narrative format
- **Template Management**: Save report configurations as reusable templates for consistent analysis
- **Automated Scheduling**: Schedule recurring reports with flexible timing options
- **Multi-Format Output**: Generate reports in professional PDF and Word formats with rich formatting
- **Webex Integration**: Deliver reports directly to users or rooms via Webex bot
- **Analytics Dashboard**: Track report generation trends and usage patterns
- **Secure & Scalable**: Enterprise-grade security with role-based access control and self-hosted deployment

## Technology Stack

### Frontend
- **React 18+** with **Next.js 14+** for modern, performant UI
- **TypeScript** for type-safe development
- **Tailwind CSS** + **Shadcn/ui** for beautiful, accessible components
- **TanStack Query** for efficient data fetching and state management

### Backend
- **Node.js 20 LTS** with **Fastify** for high-performance API
- **TypeScript** for type-safe backend development
- **Prisma** ORM with **PostgreSQL** for reliable data persistence
- **OpenAI** and **X.ai** SDKs for AI-powered content generation
- **Puppeteer** for PDF generation, **docx** library for Word documents

### Infrastructure
- **Docker** for containerization and consistent environments
- **Nginx** for reverse proxy and SSL termination
- **Redis** (optional) for caching and job queues
- Self-hosted/on-premises deployment ready

## Documentation

### Getting Started
- **[Setup Guide](SETUP_GUIDE.md)**: Complete guide to setting up your development environment and running the application
- **[Implementation Plan](IMPLEMENTATION_PLAN.md)**: Comprehensive 17-week implementation plan with detailed phases, deliverables, and timelines
- **[Technical Specifications](TECHNICAL_SPECIFICATIONS.md)**: Detailed technical specifications including workflows, LLM integration, report generation, and API documentation

### Quick Links
- [Architecture Overview](IMPLEMENTATION_PLAN.md#3-system-architecture)
- [Data Models](IMPLEMENTATION_PLAN.md#4-data-models)
- [API Specifications](IMPLEMENTATION_PLAN.md#5-api-design)
- [Security Considerations](IMPLEMENTATION_PLAN.md#7-security-considerations)
- [Workflow Details](TECHNICAL_SPECIFICATIONS.md#1-workflow-specifications)
- [LLM Integration](TECHNICAL_SPECIFICATIONS.md#2-llm-integration-details)

## Quick Start

### Prerequisites
- Node.js 20 LTS or higher
- PostgreSQL 15+ (or Docker)
- OpenAI API key
- X.ai API key
- Existing Webex bot token

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd iiot-account-intelligence
   ```

2. **Set up the database**
   ```bash
   # Using Docker (recommended)
   docker-compose up -d

   # Or install PostgreSQL locally
   ```

3. **Backend setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npx prisma migrate dev
   npx prisma db seed
   npm run dev
   ```

4. **Frontend setup**
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Default admin: admin@example.com / admin123

For detailed setup instructions, see the [Setup Guide](SETUP_GUIDE.md).

## Project Structure

```
iiot-account-intelligence/
├── backend/                # Node.js/Fastify API server
│   ├── src/
│   │   ├── routes/        # API route definitions
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Auth, validation, etc.
│   │   ├── models/        # Prisma client & types
│   │   └── utils/         # Helper functions
│   ├── prisma/            # Database schema & migrations
│   └── tests/             # Backend tests
├── frontend/              # Next.js React application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/               # Utilities & API client
│   └── hooks/             # Custom React hooks
├── docker/                # Docker configurations
├── docs/                  # Additional documentation
├── IMPLEMENTATION_PLAN.md
├── TECHNICAL_SPECIFICATIONS.md
├── SETUP_GUIDE.md
└── README.md
```

## Workflows

### 1. Account Intelligence

Generate comprehensive account reports with customizable sections:
- Account Overview (company description, size, leadership)
- Financial Health (revenue trends, profitability, outlook)
- Security Events (incidents, compliance, posture)
- Current Events (recent news, product launches, partnerships)

**Use Case**: Before a customer meeting, generate an up-to-date account intelligence report to understand the customer's current situation, challenges, and opportunities.

### 2. Competitive Intelligence

Analyze competitors from the Cisco IIoT perspective:
- Company overview and market position
- Product offerings and technology stack
- Strengths and weaknesses
- Cisco IIoT competitive positioning
- Win strategies and recommendations

**Use Case**: When competing against a specific vendor, generate a competitive intelligence report to understand how to position Cisco's IIoT solutions effectively.

### 3. News Digest

Create executive-style news briefs covering multiple accounts:
- Recent news across all specified accounts
- Narrative, journalistic format
- One-page concise summary
- Organized by theme or by company

**Use Case**: At the start of each week, generate a news digest for your top 10 accounts to stay informed about what's happening with your customers.

## Features in Detail

### AI-Powered Data Enrichment
- Validates and enriches company names
- Extracts information from bulk text or CSV uploads
- Provides confidence scores for data quality

### Professional Report Generation
- PDF and Word formats with user selection
- Rich formatting: tables, graphics, titles, hyperlinks
- Professional templates with customizable branding
- Header/footer with metadata

### Template System
- Save report configurations for reuse
- Template management interface
- Apply templates to new reports
- Share best practices across teams

### Automated Scheduling
- Recurring reports (daily, weekly, monthly)
- Cron-like scheduling flexibility
- Timezone awareness
- Delivery via download or Webex bot

### Analytics Dashboard
- Report generation trends over time
- Workflow type distribution
- Success/failure rates
- Usage statistics and insights

### Security & Administration
- Email/password authentication
- Role-based access control (Admin/User)
- Encrypted API key storage
- Audit logging for compliance
- HTTPS/TLS encryption

## Development Roadmap

The project follows a 17-week implementation plan divided into 11 phases:

- **Weeks 1-2**: Foundation & authentication
- **Weeks 3-4**: LLM integration & data enrichment
- **Weeks 5-6**: Report generation engine
- **Weeks 7-8**: Account Intelligence workflow
- **Week 9**: Competitive Intelligence workflow
- **Week 10**: News Digest workflow
- **Weeks 11-12**: Templates & scheduling
- **Week 13**: Webex integration
- **Week 14**: Analytics & admin features
- **Weeks 15-16**: Testing & documentation
- **Week 17**: Deployment & training

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for detailed timelines and deliverables.

## API Overview

### Authentication
```
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login
POST /api/auth/logout      # Logout
GET  /api/auth/me          # Get current user
```

### Reports
```
POST   /api/reports              # Create new report
GET    /api/reports              # List user's reports
GET    /api/reports/:id          # Get report details
DELETE /api/reports/:id          # Delete report
GET    /api/reports/:id/download # Download report
POST   /api/reports/:id/deliver  # Deliver via Webex
```

### Templates & Schedules
```
POST   /api/templates      # Create template
GET    /api/templates      # List templates
PUT    /api/templates/:id  # Update template
DELETE /api/templates/:id  # Delete template

POST   /api/schedules      # Create schedule
GET    /api/schedules      # List schedules
PUT    /api/schedules/:id  # Update schedule
DELETE /api/schedules/:id  # Delete schedule
```

### Admin
```
GET  /api/admin/users          # List all users
POST /api/admin/users          # Create user
PUT  /api/admin/config         # Update system config
GET  /api/admin/analytics      # System analytics
```

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md#5-api-design) for complete API documentation.

## Contributing

This project follows a structured development approach with clear phases and deliverables. When contributing:

1. Review the [Implementation Plan](IMPLEMENTATION_PLAN.md) to understand the project architecture
2. Follow the [Technical Specifications](TECHNICAL_SPECIFICATIONS.md) for implementation details
3. Write tests for new features
4. Follow TypeScript best practices and ESLint rules
5. Update documentation as needed

## Security

Security is a top priority:

- All API keys and tokens are encrypted at rest
- Passwords are hashed with bcrypt (cost factor: 12)
- JWT tokens for stateless authentication
- HTTPS/TLS for all communications
- Rate limiting on all endpoints
- Input validation on all user data
- SQL injection prevention via Prisma ORM
- XSS protection via Content Security Policy

See [Security Considerations](IMPLEMENTATION_PLAN.md#7-security-considerations) for details.

## Performance

Target performance metrics:

- Page load (First Contentful Paint): < 1.5s
- API response (simple): < 200ms
- Report generation: < 2 minutes
- Support for 50-100 concurrent users
- 500-1000 daily reports

See [Performance Requirements](TECHNICAL_SPECIFICATIONS.md#7-performance-requirements) for details.

## Testing

The project includes comprehensive testing:

- **Unit Tests**: Service layer, utilities, validators
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: Complete user workflows with Playwright
- **Security Tests**: Authentication, authorization, input validation
- **Performance Tests**: Load testing with k6 or Artillery

Run tests:
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npx playwright test
```

## Deployment

### Self-Hosted Deployment

The application is designed for self-hosted/on-premises deployment:

1. Set up production server (Ubuntu 22.04 LTS recommended)
2. Install Docker and Docker Compose
3. Configure environment variables
4. Set up SSL certificates (Let's Encrypt)
5. Deploy with Docker Compose
6. Configure Nginx reverse proxy
7. Set up backup procedures

See [Deployment Architecture](IMPLEMENTATION_PLAN.md#9-deployment-architecture) for detailed instructions.

### Production Checklist

- [ ] PostgreSQL configured with backups
- [ ] SSL/TLS certificates installed
- [ ] Environment variables secured
- [ ] API keys and tokens configured
- [ ] Webex bot credentials set up
- [ ] Admin account created
- [ ] Firewall rules configured
- [ ] Monitoring and alerting set up
- [ ] Backup procedures tested
- [ ] User training completed

## License

[To be determined]

## Support

For questions, issues, or feature requests:

- Review the [documentation](IMPLEMENTATION_PLAN.md)
- Check the [troubleshooting guide](SETUP_GUIDE.md#troubleshooting)
- Open an issue in the repository
- Contact the development team

## Acknowledgments

Built with modern, open-source technologies:
- Next.js, React, and TypeScript
- Fastify and Prisma
- OpenAI and X.ai APIs
- Shadcn/ui component library
- And many other excellent open-source projects

---

**Status**: Planning & Design Phase
**Version**: 1.0.0
**Last Updated**: 2025-11-24

Ready to begin implementation? Start with the [Setup Guide](SETUP_GUIDE.md)!

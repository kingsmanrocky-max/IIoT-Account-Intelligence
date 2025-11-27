# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IIoT Account Intelligence is an AI-powered platform for generating account intelligence, competitive analysis, and news digests using LLMs (OpenAI GPT and X.ai Grok). The project is a monorepo with a Next.js 15 frontend and Fastify backend.

## Development Commands

### Backend (run from `/backend`)
```bash
npm run dev              # Start dev server with hot reload (port 4001)
npm run build            # Compile TypeScript to dist/
npm run start            # Run production build
npm run lint             # Run ESLint
npm test                 # Run Jest tests
npm run test:watch       # Jest in watch mode

# Prisma/Database commands
npm run prisma:generate  # Generate Prisma client (run after schema changes)
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio GUI
npm run db:seed          # Seed database with initial data
```

### Frontend (run from `/frontend`)
```bash
npm run dev              # Start Next.js dev server (port 4000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Docker (from project root)
```bash
docker-compose up -d     # Start PostgreSQL (5433) and Redis (6380)
```

## Architecture

```
Frontend (Next.js 15)          Backend (Fastify)
Port 4000                      Port 4001
     │                              │
     ├── app/                       ├── src/
     │   ├── (auth)/               │   ├── routes/
     │   ├── (dashboard)/          │   ├── controllers/
     │   └── admin/                │   ├── services/        (business logic)
     ├── components/               │   ├── jobs/            (background processors)
     ├── lib/                      │   ├── models/          (Prisma client)
     │   └── api.ts (Axios)        │   ├── middleware/
     └── types/                    │   └── validators/
                                    │
         HTTP/REST API              ├── PostgreSQL (5433)
              ↓                     └── Redis (6380, optional)
           Backend
              ↓
         OpenAI/X.ai
```

### Backend Architecture
- **Service-oriented**: Business logic lives in `services/`, routes delegate to controllers which call services
- **Background processors**: Singleton processors for exports, delivery, scheduling, cleanup, and podcasts
- **Prisma ORM**: Schema-first approach with migrations (`backend/prisma/schema.prisma`)
- **JWT authentication**: Stateless auth with tokens in Authorization header
- **Winston logging**: Structured logging throughout the application

### Frontend Architecture
- **Next.js App Router**: Uses route groups `(auth)` and `(dashboard)` for layout organization
- **Path alias**: `@/*` maps to the frontend project root for imports
- **TanStack Query**: Data fetching with automatic caching and invalidation
- **AuthContext**: User authentication state managed via React Context
- **Axios interceptors**: Auto-attach JWT tokens, handle 401 redirects

## Technology Stack

**Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4, TanStack Query, React Hook Form, Zod, Recharts

**Backend**: Node.js 20, Fastify 5, TypeScript, Prisma 5, PostgreSQL 15, OpenAI SDK, JWT, bcrypt, Winston, Puppeteer, node-cron

**Infrastructure**: Docker, PostgreSQL (5433), Redis (6380), Nginx

## Key Patterns and Conventions

### Database Models
- **User**: Authentication and roles (ADMIN/USER)
- **Report**: Generated reports with status tracking (PENDING, PROCESSING, COMPLETED, FAILED)
- **Template**: Saved report configurations
- **Schedule**: Cron-based scheduled reports
- **DocumentExport**: PDF/DOCX export tracking
- **PodcastGeneration**: Podcast generation jobs

### Workflow Types
1. **ACCOUNT_INTELLIGENCE**: Company research reports
2. **COMPETITIVE_INTELLIGENCE**: Competitor analysis
3. **NEWS_DIGEST**: Multi-account news briefs

### Code Conventions
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- PascalCase for React components, camelCase for functions/variables
- Prisma enums for type safety throughout the stack

## Environment Setup

**Backend** requires `.env` in `/backend`:
```
DATABASE_URL=postgresql://user:pass@localhost:5433/iiot_db
JWT_SECRET=<32+ character secret>
ENCRYPTION_KEY=<64 character hex key>
OPENAI_API_KEY=<your-key>
```

**Frontend** optionally uses `.env.local` in `/frontend`:
```
NEXT_PUBLIC_API_URL=http://localhost:4001/api
```

## Important Ports

| Service    | Port | URL                          |
|------------|------|------------------------------|
| Frontend   | 4000 | http://localhost:4000        |
| Backend    | 4001 | http://localhost:4001/api    |
| PostgreSQL | 5433 | localhost:5433               |
| Redis      | 6380 | localhost:6380               |

## Deployment Workflow (Windows → GCP)

### Production Environment
- **Cloud Provider**: Google Cloud Platform (GCP)
- **VM Instance**: iiot-intelligence (us-central1-a)
- **External IP**: 35.193.254.12
- **App Location**: /opt/iiot-app
- **Database Name**: iiot_intelligence (NOT iiot_db)

### Quick Deployment
From Windows PC, use the simple deployment script:
```bash
deploy.bat
```

This script:
1. Commits and pushes code to GitHub (master branch)
2. SSHs into GCP VM
3. Pulls latest code
4. Rebuilds Docker containers
5. Runs Prisma migrations
6. Shows deployment status

### Other Helper Scripts
```bash
check-status.bat    # Check production container status
view-logs.bat       # View backend logs
```

### Manual Deployment Steps
If you need to deploy manually:

```bash
# 1. Commit and push from local
git add .
git commit -m "Your changes"
git push origin master

# 2. SSH to VM and update
gcloud compute ssh iiot-intelligence --zone=us-central1-a
cd /opt/iiot-app
sudo git pull origin master

# 3. Rebuild and restart containers
sudo docker compose -f docker-compose.prod.yml build
sudo docker compose -f docker-compose.prod.yml up -d

# 4. Run migrations if needed
sudo docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

# 5. Check status
sudo docker ps
```

### Important Production Notes

1. **Database Configuration**
   - Production database name: `iiot_intelligence`
   - Local dev database name: `iiot_db`
   - The DATABASE_URL in production `.env` must use `iiot_intelligence`

2. **Health Check Endpoint**
   - Backend health check is at `/health` (NOT `/api/health`)
   - Configured in `backend/Dockerfile` line 54
   - Health check runs every 30s with 40s start period

3. **Docker Compose**
   - Production config: `docker-compose.prod.yml`
   - Local dev config: `docker-compose.yml` (PostgreSQL + Redis only)
   - Always use `docker compose` (v2) not `docker-compose` (v1)

4. **Git Workflow**
   - Work exclusively from `master` branch
   - All development branches have been consolidated
   - Simple workflow: code → commit → push → deploy

5. **Container Health**
   - All containers should show "healthy" status
   - If backend shows "unhealthy", check:
     - DATABASE_URL has correct database name
     - Health check endpoint is correct
     - Container logs: `sudo docker logs iiot-backend-prod`

### Troubleshooting Deployment

**Backend won't start:**
```bash
# Check logs
gcloud compute ssh iiot-intelligence --zone=us-central1-a --command="sudo docker logs iiot-backend-prod --tail=100"

# Verify database name
gcloud compute ssh iiot-intelligence --zone=us-central1-a --command="sudo docker exec iiot-postgres-prod psql -U iiot_user -l"

# Check .env file
gcloud compute ssh iiot-intelligence --zone=us-central1-a --command="sudo cat /opt/iiot-app/backend/.env | grep DATABASE_URL"
```

**Containers unhealthy:**
```bash
# Rebuild without cache
gcloud compute ssh iiot-intelligence --zone=us-central1-a --command="cd /opt/iiot-app && sudo docker compose -f docker-compose.prod.yml build --no-cache && sudo docker compose -f docker-compose.prod.yml up -d"
```

## Additional Documentation

- `WORKFLOW.md` - Simple development and deployment guide for beginners
- `README.md` - Quick start guide
- `SETUP_GUIDE.md` - Detailed setup instructions
- `TECHNICAL_SPECIFICATIONS.md` - Comprehensive technical specs
- `VIRTUAL_PODCAST_DESIGN.md` - Podcast feature architecture
- `deploy/gcp/README.md` - GCP deployment details

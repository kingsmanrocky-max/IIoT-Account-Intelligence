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
docker-compose up -d     # Start PostgreSQL (5433) and Redis (6380) only
```

### Local Docker Testing (Optional)
Test the full containerized stack locally before deploying:

```bash
# Hot-reload mode (fastest iteration)
docker-local-dev.bat     # Start with source code mounted
                         # Changes reflect instantly
                         # Access at http://localhost

# Production mirror (final validation)
docker-local-prod.bat    # Full build like production
                         # Use before deploy.bat
                         # Access at http://localhost

# Stop containers
docker-local-stop.bat

# View logs
docker-local-logs.bat dev backend
docker-local-logs.bat prod frontend
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

| Service    | Port | npm run dev | Docker Local Testing |
|------------|------|-------------|----------------------|
| Nginx      | 80   | -           | http://localhost     |
| Frontend   | 4000 | http://localhost:4000 | http://localhost:4000 |
| Backend    | 4001 | http://localhost:4001/api | http://localhost:4001/api |
| PostgreSQL | 5433 | localhost:5433 | localhost:5433 |
| Redis      | 6380 | localhost:6380 | localhost:6380 |

**Recommended access:**
- `npm run dev`: Use http://localhost:4000 (direct)
- `docker-local-*`: Use http://localhost (nginx proxy)

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

## Local Docker Testing Workflow

### Overview
The project includes two Docker testing modes for validating changes before production deployment:

1. **Dev Mode** (`docker-local-dev.bat`) - Hot-reload with source volumes
2. **Prod Mode** (`docker-local-prod.bat`) - Full production mirror build

### Recommended Development Workflow

```
Step 1: npm run dev              → Fast local development
Step 2: docker-local-dev.bat     → Test in Docker with hot-reload (optional)
Step 3: docker-local-prod.bat    → Full production build validation (recommended)
Step 4: deploy.bat               → Deploy to GCP production
```

### Docker Compose Files

| File | Purpose | Services |
|------|---------|----------|
| `docker-compose.yml` | Dev databases only | postgres:5433, redis:6380 |
| `docker-compose.local.yml` | Local test base | postgres:5433, redis:6380, network |
| `docker-compose.local-dev.yml` | Hot-reload mode | + backend, frontend, nginx (port 80) |
| `docker-compose.local-prod.yml` | Production mirror | + backend, frontend, nginx (port 80) |
| `docker-compose.prod.yml` | GCP production | All services with SSL |

### Dev Mode (Hot-Reload)

**What it does:**
- Mounts source code as Docker volumes
- Runs `npm run dev` inside containers
- Changes reflect instantly without rebuild
- Includes nginx on port 80

**When to use:**
- Quick testing of containerized environment
- Debugging container-specific issues
- Testing nginx proxy configuration

**Start:**
```bash
docker-local-dev.bat
# Access at http://localhost (nginx proxy)
# Or directly: http://localhost:4000 (frontend), http://localhost:4001 (backend)
```

**Configuration:**
- Backend: `NODE_ENV=development`, connects to postgres:5432 internally
- Frontend: `NEXT_PUBLIC_API_URL=http://localhost/api` (via nginx)
- Nginx: HTTP-only config at `nginx/nginx.local.conf`

### Prod Mode (Production Mirror)

**What it does:**
- Builds containers from Dockerfiles (multi-stage builds)
- Runs production builds (`npm start`)
- Exactly mirrors GCP production behavior
- HTTP-only (no SSL) for local testing

**When to use:**
- **Before every deployment** to catch build issues
- Validate Docker-specific behavior
- Test production optimizations
- Ensure no container config drift

**Start:**
```bash
docker-local-prod.bat
# Builds images, then starts containers
# Access at http://localhost
```

**Configuration:**
- Backend: `NODE_ENV=production`, reads `.env` file
- Frontend: `NEXT_PUBLIC_API_URL=http://localhost/api` (build arg)
- Nginx: Same config as dev mode (HTTP-only)

### Helper Scripts

```bash
docker-local-dev.bat       # Start hot-reload mode
docker-local-prod.bat      # Build and start production mirror
docker-local-stop.bat      # Stop all local Docker containers
docker-local-logs.bat dev backend    # View dev mode logs
docker-local-logs.bat prod frontend  # View prod mode logs
```

### Port Usage

All Docker modes use the same ports as `npm run dev`:

| Port | Service | npm run dev | docker-local-dev | docker-local-prod |
|------|---------|-------------|------------------|-------------------|
| 80 | nginx | - | ✓ | ✓ |
| 4000 | frontend | ✓ | ✓ | ✓ |
| 4001 | backend | ✓ | ✓ | ✓ |
| 5433 | postgres | ✓ | ✓ | ✓ |
| 6380 | redis | ✓ | ✓ | ✓ |

**Access URLs:**
- `npm run dev`: http://localhost:4000 (direct frontend)
- Docker modes: http://localhost (nginx proxy to frontend/backend)

### Volumes and Data Persistence

**Dev mode volumes:**
- `./backend:/app` - Source code hot-reload
- `./frontend:/app` - Source code hot-reload
- `/app/node_modules` - Anonymous volume (prevent host override)
- `/app/.next` - Anonymous volume (Next.js cache)

**Prod mode volumes:**
- `backend_local_storage` - Persistent report/podcast storage
- `backend_local_logs` - Persistent logs
- `postgres_local_data` - Persistent database
- `redis_local_data` - Persistent cache

**Cleanup:**
```bash
# Remove all local Docker volumes
docker volume rm postgres_local_data redis_local_data backend_local_storage backend_local_logs
```

### Nginx Configuration

**Production (`nginx/nginx.conf`):**
- Enforces HTTPS redirect on port 80
- SSL termination on port 443
- Full security headers

**Local (`nginx/nginx.local.conf`):**
- HTTP-only on port 80 (no SSL)
- No HTTPS redirect
- Same proxy rules for `/` and `/api`
- Audio streaming optimization for podcasts

### Troubleshooting Local Docker

**Containers won't start:**
```bash
# Check Docker is running
docker ps

# View container logs
docker-local-logs.bat dev backend
docker-local-logs.bat prod frontend

# Rebuild without cache
docker compose -f docker-compose.local-prod.yml build --no-cache
```

**Port conflicts:**
```bash
# Stop current npm run dev processes first
# Or stop other Docker stacks
docker-local-stop.bat
docker compose down  # Stop regular dev databases
```

**Frontend can't reach backend:**
- Check `NEXT_PUBLIC_API_URL` is set to `http://localhost/api`
- Verify nginx is running: `docker ps | findstr nginx`
- Test backend directly: http://localhost:4001/health

**Database connection issues:**
```bash
# Check database is healthy
docker ps | findstr postgres

# Connect to database
docker exec -it iiot-postgres-local psql -U postgres -d iiot_intelligence
```

### Key Differences from Production

| Aspect | Local Docker | GCP Production |
|--------|--------------|----------------|
| SSL | HTTP only (port 80) | HTTPS with SSL (port 443) |
| Database port | 5433 (external) | 5432 (external) |
| Redis port | 6380 (external) | 6379 (external) |
| Domain | localhost | 35.193.254.12 |
| Volumes | Local named volumes | Persistent on VM |
| Container names | `-local` or `-local-dev`/`-prod` | `-prod` suffix |

## Additional Documentation

- `WORKFLOW.md` - Simple development and deployment guide for beginners
- `README.md` - Quick start guide
- `SETUP_GUIDE.md` - Detailed setup instructions
- `TECHNICAL_SPECIFICATIONS.md` - Comprehensive technical specs
- `VIRTUAL_PODCAST_DESIGN.md` - Podcast feature architecture
- `deploy/gcp/README.md` - GCP deployment details

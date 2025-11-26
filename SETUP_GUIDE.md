# IIoT Account Intelligence - Setup Guide

## Quick Start Guide

This guide will help you set up the development environment and begin building the IIoT Account Intelligence application.

---

## Prerequisites

### Required Software

- **Node.js**: v20 LTS or higher
  - Download: https://nodejs.org/
  - Verify: `node --version`

- **npm or pnpm**: Latest version
  - npm comes with Node.js
  - pnpm (recommended): `npm install -g pnpm`

- **PostgreSQL**: v15 or higher
  - Download: https://www.postgresql.org/download/
  - Or use Docker (see below)

- **Git**: Latest version
  - Download: https://git-scm.com/

- **Docker** (Optional but recommended):
  - Download: https://www.docker.com/products/docker-desktop/

- **Code Editor**: VS Code recommended
  - Download: https://code.visualstudio.com/

### Required API Keys

Before starting, obtain API keys for:

1. **OpenAI API Key**
   - Sign up: https://platform.openai.com/
   - Create API key in dashboard

2. **X.ai API Key**
   - Sign up: https://x.ai/
   - Generate API key

3. **Webex Bot Token**
   - Access your existing Webex bot configuration
   - Copy bot access token

---

## Project Initialization

### Step 1: Create Project Structure

```bash
# Create main project directory
mkdir iiot-account-intelligence
cd iiot-account-intelligence

# Initialize git repository
git init

# Create directory structure
mkdir -p backend frontend docs docker
```

### Step 2: Backend Setup

```bash
cd backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install fastify @fastify/cors @fastify/helmet @fastify/rate-limit
npm install @prisma/client bcrypt jsonwebtoken
npm install openai axios
npm install puppeteer handlebars docx
npm install csv-parse node-cron
npm install winston dotenv

# Install dev dependencies
npm install -D typescript @types/node @types/bcrypt @types/jsonwebtoken
npm install -D prisma ts-node ts-node-dev
npm install -D @types/node-cron
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

**Create TypeScript Configuration (`backend/tsconfig.json`):**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Create Backend Directory Structure:**

```bash
mkdir -p src/{config,routes,controllers,services,middleware,validators,models,utils,types,jobs,templates}
mkdir -p tests/{unit,integration,e2e}
mkdir -p prisma
mkdir logs storage/reports
```

**Initialize Prisma:**

```bash
npx prisma init
```

**Edit `backend/prisma/schema.prisma`** (copy from IMPLEMENTATION_PLAN.md section 4.1)

**Create Environment File (`backend/.env`):**

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/iiot_intelligence"

# Server
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# Authentication
JWT_SECRET=your_jwt_secret_change_this_in_production
JWT_EXPIRATION=7d
REFRESH_TOKEN_EXPIRATION=30d

# Encryption
ENCRYPTION_KEY=your_32_byte_hex_key_here

# LLM API Keys
OPENAI_API_KEY=your_openai_api_key
XAI_API_KEY=your_xai_api_key

# Webex
WEBEX_BOT_TOKEN=your_webex_bot_token

# File Storage
STORAGE_PATH=./storage/reports
MAX_FILE_SIZE=10485760

# Report Settings
REPORT_RETENTION_DAYS=90

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=./logs

# Redis (optional)
# REDIS_URL=redis://localhost:6379
```

### Step 3: Frontend Setup

```bash
cd ../frontend

# Create Next.js project
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

# Install additional dependencies
npm install @tanstack/react-query axios
npm install @hookform/resolvers react-hook-form zod
npm install date-fns
npm install recharts
npm install lucide-react

# Install Shadcn/ui
npx shadcn-ui@latest init

# Install common components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add form
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add checkbox
```

**Create Frontend Directory Structure:**

```bash
mkdir -p app/\(auth\)/{login,register}
mkdir -p app/\(dashboard\)/{account-intelligence,competitive-intelligence,news-digest,templates,schedules,reports,analytics,profile}
mkdir -p app/\(admin\)/{users,settings,analytics}
mkdir -p components/{ui,forms,reports,layout,analytics}
mkdir -p lib hooks types
```

**Create Environment File (`frontend/.env.local`):**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Step 4: Docker Setup (Optional)

**Create `docker-compose.yml` in project root:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: iiot-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: iiot_intelligence
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: iiot-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**Start Docker Services:**

```bash
docker-compose up -d
```

---

## Database Setup

### Initialize Database

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# (Optional) Seed database with initial data
npx prisma db seed
```

### Create Database Seed File

**Create `backend/prisma/seed.ts`:**

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      profile: {
        create: {
          defaultLLMModel: 'gpt-4',
          timezone: 'UTC',
        },
      },
    },
  });

  console.log('Created admin user:', admin.email);

  // Create test user
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: userPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      profile: {
        create: {
          defaultLLMModel: 'gpt-4',
          timezone: 'America/New_York',
        },
      },
    },
  });

  console.log('Created test user:', user.email);

  // Create system config entries
  const configs = [
    {
      key: 'default_llm_provider',
      value: 'openai',
      isEncrypted: false,
      description: 'Default LLM provider (openai or xai)',
    },
    {
      key: 'default_llm_model',
      value: 'gpt-4',
      isEncrypted: false,
      description: 'Default LLM model to use',
    },
    {
      key: 'report_retention_days',
      value: '90',
      isEncrypted: false,
      description: 'Number of days to retain reports',
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('Created system configuration');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Add seed script to `backend/package.json`:**

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## Backend Development

### Create Basic Server

**Create `backend/src/index.ts`:**

```typescript
import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    const app = await createApp();

    await app.listen({
      port: Number(PORT),
      host: '0.0.0.0',
    });

    logger.info(`Server listening on http://localhost:${PORT}`);
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

start();
```

**Create `backend/src/app.ts`:**

```typescript
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { logger } from './utils/logger';

// Import routes (to be created)
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import reportRoutes from './routes/report.routes';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Use custom logger
  });

  // Register plugins
  await app.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // Customize as needed
  });

  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  });

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(reportRoutes, { prefix: '/api/reports' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: error.statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    });
  });

  return app;
}
```

**Create `backend/src/utils/logger.ts`:**

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: `${process.env.LOG_FILE_PATH}/error.log`,
      level: 'error',
    }),
    new winston.transports.File({
      filename: `${process.env.LOG_FILE_PATH}/combined.log`,
    }),
  ],
});
```

**Add scripts to `backend/package.json`:**

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

---

## Frontend Development

### Create Basic Layout

**Update `frontend/app/layout.tsx`:**

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IIoT Account Intelligence',
  description: 'AI-powered account and competitive intelligence platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Create `frontend/components/providers.tsx`:**

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
```

**Create `frontend/lib/api.ts`:**

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Database (if using Docker):**
```bash
docker-compose up
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health
- **Prisma Studio**: `npm run prisma:studio` (in backend directory)

### Test Accounts

After seeding:
- **Admin**: admin@example.com / admin123
- **User**: user@example.com / user123

---

## Development Workflow

### 1. Database Changes

```bash
# Make changes to prisma/schema.prisma
# Then create migration
npx prisma migrate dev --name your_migration_name

# Regenerate Prisma Client
npx prisma generate
```

### 2. Adding New API Endpoints

1. Create route file in `backend/src/routes/`
2. Create controller in `backend/src/controllers/`
3. Create service in `backend/src/services/`
4. Add validation in `backend/src/validators/`
5. Register route in `backend/src/app.ts`

### 3. Adding New UI Pages

1. Create page in appropriate `app/` directory
2. Create components in `components/`
3. Add API calls in `lib/api.ts`
4. Create hooks if needed in `hooks/`

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.service.test.ts
```

### Frontend Tests

```bash
cd frontend

# Run component tests
npm test

# Run E2E tests with Playwright
npx playwright test
```

---

## Useful Commands

### Database

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View database
psql -U postgres -d iiot_intelligence
```

### Docker

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up --build
```

### Git

```bash
# Initial commit
git add .
git commit -m "Initial project setup"

# Create .gitignore
cat > .gitignore << EOF
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment
.env
.env.local
.env*.local

# Build outputs
dist/
build/
.next/

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Storage
storage/reports/*
!storage/reports/.gitkeep
EOF
```

---

## Troubleshooting

### Common Issues

**Issue: Database connection error**
```
Solution: Ensure PostgreSQL is running
- Check Docker: docker-compose ps
- Check local: pg_isready
- Verify DATABASE_URL in .env
```

**Issue: Port already in use**
```
Solution: Change port or kill process
- Find process: lsof -i :3001 (Mac/Linux) or netstat -ano | findstr :3001 (Windows)
- Kill process or change PORT in .env
```

**Issue: Prisma Client not generated**
```
Solution: Generate Prisma Client
cd backend
npx prisma generate
```

**Issue: Module not found**
```
Solution: Reinstall dependencies
cd backend (or frontend)
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

After completing this setup, you're ready to begin Phase 1 development:

1. ✅ Development environment set up
2. ✅ Database initialized
3. ✅ Basic backend server running
4. ✅ Frontend application running

**Next: Begin implementing authentication** (See IMPLEMENTATION_PLAN.md Phase 1, Week 2)

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-24

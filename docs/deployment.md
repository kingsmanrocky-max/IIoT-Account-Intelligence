# IIoT Account Intelligence - Deployment Guide

This guide provides step-by-step instructions for deploying the IIoT Account Intelligence application in production using Docker.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Installation Steps](#installation-steps)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [SSL Certificate Setup](#ssl-certificate-setup)
7. [Starting the Application](#starting-the-application)
8. [Health Checks](#health-checks)
9. [Backup Procedures](#backup-procedures)
10. [Monitoring and Logging](#monitoring-and-logging)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Docker**: Version 24.0 or higher
- **Docker Compose**: Version 2.20 or higher
- **Git**: For cloning the repository
- **OpenSSL**: For generating secrets

### Required API Keys

Before deployment, obtain the following API keys:

1. **OpenAI API Key**
   - Sign up at: https://platform.openai.com/
   - Navigate to API Keys section
   - Create a new secret key
   - Ensure TTS API access is enabled

2. **X.ai (Grok) API Key** (Optional)
   - Sign up at: https://x.ai/
   - Access the API section
   - Generate an API key

3. **Webex Bot Token** (Optional)
   - Create a bot at: https://developer.webex.com/my-apps/new/bot
   - Copy the bot access token

---

## Server Requirements

### Minimum Specifications

| Component | Requirement |
|-----------|-------------|
| CPU | 4 cores |
| RAM | 8 GB |
| Storage | 50 GB SSD |
| Network | 100 Mbps |
| OS | Ubuntu 22.04 LTS or similar |

### Recommended Specifications

| Component | Requirement |
|-----------|-------------|
| CPU | 8 cores |
| RAM | 16 GB |
| Storage | 200 GB SSD |
| Network | 1 Gbps |

### Ports Required

| Port | Service | Description |
|------|---------|-------------|
| 80 | Nginx | HTTP (redirects to HTTPS) |
| 443 | Nginx | HTTPS |
| 5432 | PostgreSQL | Database (internal) |
| 6379 | Redis | Cache & Queue (internal) |

---

## Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourorg/iiot-account-intelligence.git
cd iiot-account-intelligence
```

### Step 2: Set Up Environment Variables

Create a production `.env` file:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env` with your production values (see [Environment Configuration](#environment-configuration)).

### Step 3: Generate Secure Secrets

```bash
# Generate JWT Secret (32+ characters)
openssl rand -base64 32

# Generate Encryption Key (64 character hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add these to your `backend/.env` file.

### Step 4: Configure Database Credentials

Create a `.env` file in the project root for docker-compose:

```bash
# Docker Compose Environment Variables
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_database_password
POSTGRES_DB=iiot_intelligence
POSTGRES_PORT=5432
REDIS_PORT=6379
```

**Security Note**: Use a strong, unique password for production.

---

## Environment Configuration

### Backend Environment Variables (`backend/.env`)

```bash
# Database
DATABASE_URL=postgresql://postgres:your_password@postgres:5432/iiot_intelligence

# Server
NODE_ENV=production
PORT=4001
API_URL=https://yourdomain.com

# Authentication
JWT_SECRET=<generated-jwt-secret-min-32-chars>
JWT_EXPIRATION=7d
REFRESH_TOKEN_EXPIRATION=30d
ENCRYPTION_KEY=<generated-encryption-key-64-hex-chars>

# LLM API Keys
OPENAI_API_KEY=sk-your-actual-openai-key
XAI_API_KEY=xai-your-actual-xai-key

# LLM Configuration
LLM_PRIMARY_PROVIDER=openai
OPENAI_DEFAULT_MODEL=gpt-4
LLM_TIMEOUT=60000
LLM_MAX_RETRIES=3

# Webex Bot
WEBEX_BOT_TOKEN=your-webex-bot-token

# Storage
STORAGE_PATH=/app/storage/reports
REPORT_RETENTION_DAYS=90

# Redis
REDIS_URL=redis://redis:6379

# Frontend
FRONTEND_URL=https://yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs
```

### Frontend Environment Variables (`frontend/.env.local`)

```bash
# Leave empty for auto-detection or set to backend URL
NEXT_PUBLIC_API_URL=
```

---

## Database Setup

### Step 1: Start Database Services

```bash
docker-compose -f docker-compose.prod.yml up -d postgres redis
```

### Step 2: Wait for Health Checks

```bash
docker-compose -f docker-compose.prod.yml ps
```

Ensure both `postgres` and `redis` show as "healthy".

### Step 3: Run Database Migrations

```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Step 4: Seed Initial Data

```bash
docker-compose -f docker-compose.prod.yml exec backend npm run db:seed
```

This creates:
- Default admin user (admin@example.com / admin123)
- Podcast hosts and templates
- Default prompt configurations

**Important**: Change the default admin password immediately after first login.

---

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended)

1. Install Certbot:

```bash
sudo apt-get update
sudo apt-get install certbot
```

2. Create SSL directory:

```bash
mkdir -p nginx/ssl
```

3. Obtain certificate:

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

4. Copy certificates:

```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

5. Set permissions:

```bash
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem
```

6. Enable HTTPS in `nginx/nginx.conf`:
   - Uncomment the HTTPS server block
   - Update `server_name` to your domain
   - Uncomment the HTTP to HTTPS redirect

### Option 2: Self-Signed Certificate (Development/Testing)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=yourdomain.com"
```

---

## Starting the Application

### Full Stack Startup

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Check All Services

```bash
docker-compose -f docker-compose.prod.yml ps
```

All services should show status "Up" and health checks as "healthy".

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

---

## Health Checks

### Application Health Endpoints

```bash
# Backend health check
curl http://localhost:4001/api/health

# Frontend (through Nginx)
curl http://localhost/
```

### Expected Response

Backend health endpoint should return:
```json
{
  "status": "ok",
  "timestamp": "2025-11-26T..."
}
```

### Service Health Checks

```bash
# PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

---

## Backup Procedures

### Database Backup

Create a backup script (`backup-db.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
  -U postgres iiot_intelligence > "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

Schedule daily backups with cron:

```bash
0 2 * * * /path/to/backup-db.sh
```

### File Storage Backup

Backup report and podcast files:

```bash
#!/bin/bash
BACKUP_DIR="/backups/storage"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup Docker volume
docker run --rm -v iiot_backend_storage:/source -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/storage_$TIMESTAMP.tar.gz -C /source .

# Keep only last 30 days
find $BACKUP_DIR -name "storage_*.tar.gz" -mtime +30 -delete
```

### Restore from Backup

Database restore:

```bash
# Stop backend
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
cat backup_TIMESTAMP.sql | docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres iiot_intelligence

# Start backend
docker-compose -f docker-compose.prod.yml start backend
```

Storage restore:

```bash
docker run --rm -v iiot_backend_storage:/target -v /backups/storage:/backup \
  alpine tar xzf /backup/storage_TIMESTAMP.tar.gz -C /target
```

---

## Monitoring and Logging

### Log Locations

Logs are stored in Docker volumes:

```bash
# Backend logs
docker-compose -f docker-compose.prod.yml exec backend ls /app/logs

# Nginx logs
docker volume inspect iiot_nginx_logs
```

### View Real-time Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Backend only
docker-compose -f docker-compose.prod.yml logs -f backend --tail=100
```

### Log Rotation

Configure log rotation in `/etc/logrotate.d/docker-iiot`:

```
/var/lib/docker/volumes/iiot_backend_logs/_data/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

### Monitoring with Docker Stats

```bash
docker stats
```

---

## Troubleshooting

### Issue: Container won't start

**Check logs:**
```bash
docker-compose -f docker-compose.prod.yml logs <service-name>
```

**Check container status:**
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Issue: Database connection error

**Verify database is running:**
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
```

**Check DATABASE_URL:**
```bash
docker-compose -f docker-compose.prod.yml exec backend printenv DATABASE_URL
```

**Test connection:**
```bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d iiot_intelligence -c "SELECT 1"
```

### Issue: Frontend can't reach backend

**Check network connectivity:**
```bash
docker-compose -f docker-compose.prod.yml exec frontend ping backend
```

**Verify backend is responding:**
```bash
docker-compose -f docker-compose.prod.yml exec frontend wget -O- http://backend:4001/api/health
```

### Issue: Podcast generation fails

**Check FFmpeg installation:**
```bash
docker-compose -f docker-compose.prod.yml exec backend ffmpeg -version
```

**Check storage permissions:**
```bash
docker-compose -f docker-compose.prod.yml exec backend ls -la /app/storage
```

**Check OpenAI API key:**
```bash
docker-compose -f docker-compose.prod.yml exec backend printenv OPENAI_API_KEY
```

### Issue: High memory usage

**Check memory usage per container:**
```bash
docker stats --no-stream
```

**Increase container memory limit in docker-compose.prod.yml:**
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 4G
```

### Issue: Nginx 502 Bad Gateway

**Check backend is running:**
```bash
docker-compose -f docker-compose.prod.yml ps backend
```

**Check backend logs:**
```bash
docker-compose -f docker-compose.prod.yml logs backend --tail=50
```

**Test backend directly:**
```bash
curl http://localhost:4001/api/health
```

---

## Maintenance Tasks

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild images
docker-compose -f docker-compose.prod.yml build

# Restart services (zero-downtime)
docker-compose -f docker-compose.prod.yml up -d
```

### Database Migrations

```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Clear Redis Cache

```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
```

### Restart Specific Service

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

---

## Security Checklist

- [ ] Changed default admin password
- [ ] Strong database password set
- [ ] JWT secret is 32+ characters
- [ ] Encryption key is properly generated
- [ ] SSL/TLS certificate installed
- [ ] HTTPS redirect enabled
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] `.env` files not committed to git
- [ ] Regular backups scheduled
- [ ] Log rotation configured
- [ ] API keys rotated periodically

---

## Support

For issues and questions:
- Check logs first: `docker-compose -f docker-compose.prod.yml logs`
- Review this troubleshooting section
- Check the main README.md
- Create an issue in the repository

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0

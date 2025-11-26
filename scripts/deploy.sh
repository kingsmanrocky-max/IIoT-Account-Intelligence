#!/bin/bash

# ==============================================
# Production Deployment Script
# ==============================================
# Deploys or updates the IIoT Intelligence application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}   IIoT Intelligence - Deployment${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env from .env.example and configure all variables"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Check if SSL certificates exist
if [ ! -f nginx/ssl/fullchain.pem ] || [ ! -f nginx/ssl/privkey.pem ]; then
    echo -e "${YELLOW}Warning: SSL certificates not found in nginx/ssl/${NC}"
    echo "Run ./scripts/generate-ssl-cert.sh to create self-signed certificates"
    read -p "Continue without SSL? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
        exit 0
    fi
fi

echo -e "${GREEN}Starting deployment...${NC}"
echo ""

# Pull latest code (if using git)
if [ -d .git ]; then
    echo -e "${YELLOW}[1/5] Pulling latest code...${NC}"
    git pull
    echo ""
fi

# Build containers
echo -e "${YELLOW}[2/5] Building Docker containers...${NC}"
docker-compose -f "$COMPOSE_FILE" build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed${NC}"
    exit 1
fi
echo ""

# Stop existing containers
echo -e "${YELLOW}[3/5] Stopping existing containers...${NC}"
docker-compose -f "$COMPOSE_FILE" down
echo ""

# Start containers
echo -e "${YELLOW}[4/5] Starting containers...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start containers${NC}"
    exit 1
fi
echo ""

# Wait for services to be ready
echo -e "${YELLOW}[5/5] Waiting for services to be ready...${NC}"
sleep 10

# Run database migrations
echo "Running database migrations..."
docker-compose -f "$COMPOSE_FILE" exec -T backend npm run prisma:migrate deploy

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Database migration failed${NC}"
    echo "You may need to run migrations manually"
fi
echo ""

# Health check
echo "Performing health checks..."
bash ./scripts/health-check.sh

echo ""
echo -e "${BLUE}=============================================${NC}"
echo -e "${GREEN}✓ Deployment completed successfully${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""
echo "Application URLs:"
echo "- Frontend: http://localhost (or https://yourdomain.com)"
echo "- Backend API: http://localhost/api (or https://yourdomain.com/api)"
echo ""
echo "Useful commands:"
echo "- View logs: ./scripts/logs.sh"
echo "- Health check: ./scripts/health-check.sh"
echo "- Backup: ./scripts/backup-all.sh"

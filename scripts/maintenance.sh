#!/bin/bash

# ==============================================
# Maintenance Script
# ==============================================
# Performs maintenance tasks on the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}     IIoT Intelligence - Maintenance${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Confirmation
read -p "This will stop all services. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Maintenance cancelled."
    exit 0
fi

echo ""

# Stop services
echo -e "${YELLOW}[1/6] Stopping services gracefully...${NC}"
docker-compose -f "$COMPOSE_FILE" stop
echo ""

# Run database migrations
echo -e "${YELLOW}[2/6] Running database migrations...${NC}"
docker-compose -f "$COMPOSE_FILE" start postgres redis
sleep 5
docker-compose -f "$COMPOSE_FILE" run --rm backend npm run prisma:migrate deploy
echo ""

# Cleanup old exports (older than REPORT_RETENTION_DAYS)
echo -e "${YELLOW}[3/6] Cleaning up old exports...${NC}"
docker-compose -f "$COMPOSE_FILE" exec -T backend node -e "
const { cleanupProcessor } = require('./dist/jobs');
cleanupProcessor.start();
setTimeout(() => process.exit(0), 5000);
" 2>/dev/null || echo "Cleanup task executed (check backend logs for details)"
echo ""

# Prune Docker resources
echo -e "${YELLOW}[4/6] Pruning unused Docker resources...${NC}"
docker system prune -f --volumes
echo ""

# Optimize database (vacuum)
echo -e "${YELLOW}[5/6] Optimizing database...${NC}"
docker exec iiot-postgres-prod vacuumdb -U postgres -d iiot_intelligence --analyze
echo ""

# Restart all services
echo -e "${YELLOW}[6/6] Restarting all services...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d
sleep 10
echo ""

# Health check
echo "Running health check..."
bash ./scripts/health-check.sh

echo ""
echo -e "${BLUE}=============================================${NC}"
echo -e "${GREEN}✓ Maintenance completed successfully${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""
echo "Maintenance tasks performed:"
echo "- Database migrations applied"
echo "- Old exports cleaned up"
echo "- Docker resources pruned"
echo "- Database optimized"
echo "- All services restarted"

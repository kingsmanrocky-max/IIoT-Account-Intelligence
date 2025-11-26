#!/bin/bash

# ==============================================
# Health Check Script
# ==============================================
# Checks the health of all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"

echo -e "${BLUE}=== System Health Check ===${NC}"
echo ""

# Check Docker containers
echo -e "${YELLOW}Docker Containers:${NC}"
docker-compose -f "$COMPOSE_FILE" ps

echo ""

# Check individual container health
CONTAINERS=("iiot-postgres-prod" "iiot-redis-prod" "iiot-backend-prod" "iiot-frontend-prod" "iiot-nginx-prod")
ALL_HEALTHY=true

for CONTAINER in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
        STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER")
        if [ "$STATUS" == "running" ]; then
            echo -e "${GREEN}✓${NC} $CONTAINER: $STATUS"
        else
            echo -e "${RED}✗${NC} $CONTAINER: $STATUS"
            ALL_HEALTHY=false
        fi
    else
        echo -e "${RED}✗${NC} $CONTAINER: not found"
        ALL_HEALTHY=false
    fi
done

echo ""

# Test backend API endpoint
echo -e "${YELLOW}API Endpoints:${NC}"

# Test backend health endpoint (if it exists)
if curl -s -f -o /dev/null http://localhost/api/health 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Backend API: accessible at http://localhost/api"
else
    # Try alternative health endpoint
    if curl -s -f -o /dev/null http://localhost:4001/api/health 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Backend API: accessible at http://localhost:4001/api"
    else
        echo -e "${YELLOW}⚠${NC} Backend API: health endpoint not accessible (may not be implemented yet)"
    fi
fi

# Test frontend
if curl -s -f -o /dev/null http://localhost 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Frontend: accessible at http://localhost"
else
    echo -e "${RED}✗${NC} Frontend: not accessible"
    ALL_HEALTHY=false
fi

echo ""

# Test database connectivity
echo -e "${YELLOW}Database Connectivity:${NC}"
if docker exec iiot-postgres-prod pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL: accepting connections"
else
    echo -e "${RED}✗${NC} PostgreSQL: not accepting connections"
    ALL_HEALTHY=false
fi

# Test Redis connectivity
if docker exec iiot-redis-prod redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Redis: responding"
else
    echo -e "${RED}✗${NC} Redis: not responding"
    ALL_HEALTHY=false
fi

echo ""

# Overall status
echo -e "${BLUE}=============================================${NC}"
if [ "$ALL_HEALTHY" = true ]; then
    echo -e "${GREEN}✓ All systems operational${NC}"
    echo -e "${BLUE}=============================================${NC}"
    exit 0
else
    echo -e "${RED}✗ Some systems are not healthy${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "- Check logs: ./scripts/logs.sh"
    echo "- Restart services: docker-compose -f $COMPOSE_FILE restart"
    exit 1
fi

#!/bin/bash

# ==============================================
# Log Viewer Script
# ==============================================
# View logs from Docker containers

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"

# Default values
SERVICE=""
FOLLOW=false
TAIL=100

# Usage function
usage() {
    echo "Usage: $0 [OPTIONS] [SERVICE]"
    echo ""
    echo "Options:"
    echo "  -f, --follow    Follow log output"
    echo "  -n, --tail N    Number of lines to show (default: 100)"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Services:"
    echo "  postgres        PostgreSQL database logs"
    echo "  redis           Redis cache logs"
    echo "  backend         Backend API logs"
    echo "  frontend        Frontend application logs"
    echo "  nginx           Nginx reverse proxy logs"
    echo "  all             All services (default)"
    echo ""
    echo "Examples:"
    echo "  $0 backend              # View last 100 lines of backend logs"
    echo "  $0 -f backend           # Follow backend logs"
    echo "  $0 -n 500 nginx         # View last 500 lines of nginx logs"
    echo "  $0 -f                   # Follow all logs"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--tail)
            TAIL="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            SERVICE="$1"
            shift
            ;;
    esac
done

# Validate service name
VALID_SERVICES=("postgres" "redis" "backend" "frontend" "nginx" "all" "")
if [[ ! " ${VALID_SERVICES[@]} " =~ " ${SERVICE} " ]]; then
    echo -e "${RED}Error: Invalid service name: $SERVICE${NC}"
    echo ""
    usage
    exit 1
fi

# Build docker-compose logs command
CMD="docker-compose -f $COMPOSE_FILE logs --tail=$TAIL"

if [ "$FOLLOW" = true ]; then
    CMD="$CMD -f"
fi

if [ -n "$SERVICE" ] && [ "$SERVICE" != "all" ]; then
    CMD="$CMD $SERVICE"
fi

# Display header
echo -e "${BLUE}=== Container Logs ===${NC}"
if [ -n "$SERVICE" ] && [ "$SERVICE" != "all" ]; then
    echo "Service: $SERVICE"
else
    echo "Service: all"
fi
echo "Lines: $TAIL"
if [ "$FOLLOW" = true ]; then
    echo "Mode: follow (press Ctrl+C to exit)"
fi
echo ""

# Execute command
$CMD

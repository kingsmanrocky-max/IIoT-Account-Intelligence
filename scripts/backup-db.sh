#!/bin/bash

# ==============================================
# Database Backup Script
# ==============================================
# Backs up PostgreSQL database from Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="iiot-postgres-prod"
BACKUP_DIR="./backups/database"
RETENTION_DAYS=30  # Keep backups for 30 days
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="iiot_db_backup_${TIMESTAMP}.sql.gz"

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

echo -e "${GREEN}=== Database Backup Script ===${NC}"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}Error: Container $CONTAINER_NAME is not running${NC}"
    exit 1
fi

echo "Backing up database: $POSTGRES_DB"
echo "Container: $CONTAINER_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

# Perform backup
docker exec -t "$CONTAINER_NAME" pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup completed successfully${NC}"
    echo "Location: $BACKUP_DIR/$BACKUP_FILE"
    echo "Size: $BACKUP_SIZE"
    echo ""

    # Cleanup old backups
    echo "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "iiot_db_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

    REMAINING_BACKUPS=$(ls -1 "$BACKUP_DIR"/iiot_db_backup_*.sql.gz 2>/dev/null | wc -l)
    echo -e "${GREEN}✓ Cleanup complete. $REMAINING_BACKUPS backup(s) remaining${NC}"
else
    echo -e "${RED}Error: Backup failed${NC}"
    exit 1
fi

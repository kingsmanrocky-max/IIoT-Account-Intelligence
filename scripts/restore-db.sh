#!/bin/bash

# ==============================================
# Database Restore Script
# ==============================================
# Restores PostgreSQL database from backup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="iiot-postgres-prod"
BACKUP_DIR="./backups/database"

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

echo -e "${GREEN}=== Database Restore Script ===${NC}"
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}Error: Backup directory $BACKUP_DIR not found${NC}"
    exit 1
fi

# List available backups
echo "Available backups:"
echo ""
ls -lh "$BACKUP_DIR"/iiot_db_backup_*.sql.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}'
echo ""

# Prompt for backup file
read -p "Enter the backup filename to restore: " BACKUP_FILE

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_DIR/$BACKUP_FILE${NC}"
    exit 1
fi

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}Error: Container $CONTAINER_NAME is not running${NC}"
    exit 1
fi

# Confirmation
echo ""
echo -e "${YELLOW}WARNING: This will replace all data in the database!${NC}"
echo "Database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore aborted."
    exit 0
fi

echo ""
echo "Restoring database..."

# Perform restore
gunzip < "$BACKUP_DIR/$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Database restored successfully${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Restart backend container: docker-compose -f docker-compose.prod.yml restart backend"
    echo "2. Verify application functionality"
else
    echo -e "${RED}Error: Restore failed${NC}"
    exit 1
fi

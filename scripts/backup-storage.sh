#!/bin/bash

# ==============================================
# Storage Backup Script
# ==============================================
# Backs up file storage (reports, podcasts, logs)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups/storage"
RETENTION_DAYS=30  # Keep backups for 30 days
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="iiot_storage_backup_${TIMESTAMP}.tar.gz"

# Source directories (Docker volumes)
BACKEND_STORAGE_VOL="iiot-account-intelligence_backend_storage"
BACKEND_LOGS_VOL="iiot-account-intelligence_backend_logs"

echo -e "${GREEN}=== Storage Backup Script ===${NC}"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if volumes exist
if ! docker volume ls | grep -q "$BACKEND_STORAGE_VOL"; then
    echo -e "${RED}Error: Volume $BACKEND_STORAGE_VOL not found${NC}"
    exit 1
fi

echo "Backing up storage volumes..."
echo "- $BACKEND_STORAGE_VOL"
echo "- $BACKEND_LOGS_VOL"
echo "Backup file: $BACKUP_FILE"
echo ""

# Create temporary container to access volumes
TMP_CONTAINER="iiot-backup-tmp-$(date +%s)"

docker run --rm \
    -v "$BACKEND_STORAGE_VOL:/data/storage:ro" \
    -v "$BACKEND_LOGS_VOL:/data/logs:ro" \
    -v "$(pwd)/$BACKUP_DIR:/backup" \
    alpine:latest \
    tar czf "/backup/$BACKUP_FILE" \
    -C /data \
    storage logs

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Storage backup completed successfully${NC}"
    echo "Location: $BACKUP_DIR/$BACKUP_FILE"
    echo "Size: $BACKUP_SIZE"
    echo ""

    # Cleanup old backups
    echo "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "iiot_storage_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

    REMAINING_BACKUPS=$(ls -1 "$BACKUP_DIR"/iiot_storage_backup_*.tar.gz 2>/dev/null | wc -l)
    echo -e "${GREEN}✓ Cleanup complete. $REMAINING_BACKUPS backup(s) remaining${NC}"
else
    echo -e "${RED}Error: Storage backup failed${NC}"
    exit 1
fi

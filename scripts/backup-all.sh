#!/bin/bash

# ==============================================
# Complete Backup Script
# ==============================================
# Performs full backup of database and storage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}    IIoT Intelligence - Full Backup${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""
echo "Starting full backup at $(date)"
echo ""

# Backup database
echo -e "${YELLOW}[1/2] Backing up database...${NC}"
bash "$SCRIPT_DIR/backup-db.sh"

if [ $? -ne 0 ]; then
    echo -e "${RED}Database backup failed. Aborting.${NC}"
    exit 1
fi

echo ""

# Backup storage
echo -e "${YELLOW}[2/2] Backing up storage...${NC}"
bash "$SCRIPT_DIR/backup-storage.sh"

if [ $? -ne 0 ]; then
    echo -e "${RED}Storage backup failed.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}=============================================${NC}"
echo -e "${GREEN}✓ Full backup completed successfully${NC}"
echo -e "${BLUE}=============================================${NC}"
echo "Completed at $(date)"
echo ""
echo "Backup locations:"
echo "- Database: ./backups/database/"
echo "- Storage:  ./backups/storage/"

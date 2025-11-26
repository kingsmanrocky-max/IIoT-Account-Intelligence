# Backup and Recovery Guide

This guide covers backup and recovery procedures for the IIoT Account Intelligence application.

## Table of Contents
- [Overview](#overview)
- [Backup Procedures](#backup-procedures)
- [Recovery Procedures](#recovery-procedures)
- [Automation](#automation)
- [Best Practices](#best-practices)

---

## Overview

The application has two primary data stores that need to be backed up:

1. **PostgreSQL Database** - User accounts, reports, templates, schedules, configurations
2. **File Storage** - Generated reports (PDF/DOCX), podcasts (MP3), and application logs

All backup scripts are located in the `scripts/` directory.

---

## Backup Procedures

### Manual Backup

#### Full Backup (Database + Storage)

```bash
# Run complete backup
./scripts/backup-all.sh
```

This will:
- Backup the PostgreSQL database
- Backup all file storage volumes
- Store backups in `./backups/` directory
- Clean up backups older than 30 days

#### Database Only

```bash
./scripts/backup-db.sh
```

Output location: `./backups/database/iiot_db_backup_YYYYMMDD_HHMMSS.sql.gz`

Features:
- Compressed SQL dump
- Includes `--clean` and `--if-exists` for easy restore
- No ownership/ACL information (for portability)
- Automatic cleanup of old backups (30 day retention)

#### Storage Only

```bash
./scripts/backup-storage.sh
```

Output location: `./backups/storage/iiot_storage_backup_YYYYMMDD_HHMMSS.tar.gz`

Includes:
- Generated reports (PDF, DOCX)
- Generated podcasts (MP3, WAV)
- Application logs

---

## Recovery Procedures

### Database Restore

1. **List available backups:**

```bash
ls -lh ./backups/database/
```

2. **Run restore script:**

```bash
./scripts/restore-db.sh
```

3. **Follow the prompts:**
   - Select the backup file to restore
   - Confirm the restore operation
   - Wait for completion

4. **Restart backend:**

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

5. **Verify:**

```bash
./scripts/health-check.sh
```

### Storage Restore

1. **Stop the application:**

```bash
docker-compose -f docker-compose.prod.yml down
```

2. **Extract backup to temporary location:**

```bash
mkdir -p /tmp/restore
tar -xzf ./backups/storage/iiot_storage_backup_YYYYMMDD_HHMMSS.tar.gz -C /tmp/restore
```

3. **Restore to Docker volumes:**

```bash
# Restore storage volume
docker run --rm \
  -v iiot-account-intelligence_backend_storage:/data/storage \
  -v /tmp/restore:/backup \
  alpine:latest \
  sh -c "rm -rf /data/storage/* && cp -a /backup/storage/. /data/storage/"

# Restore logs volume
docker run --rm \
  -v iiot-account-intelligence_backend_logs:/data/logs \
  -v /tmp/restore:/backup \
  alpine:latest \
  sh -c "rm -rf /data/logs/* && cp -a /backup/logs/. /data/logs/"
```

4. **Restart the application:**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

5. **Cleanup:**

```bash
rm -rf /tmp/restore
```

### Complete System Recovery

For disaster recovery scenarios:

1. **Install fresh system** with Docker and Docker Compose

2. **Clone or copy application files** to the server

3. **Restore environment configuration:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Restore SSL certificates** (if using custom certificates):

```bash
cp /backup/location/fullchain.pem nginx/ssl/
cp /backup/location/privkey.pem nginx/ssl/
```

5. **Start the infrastructure:**

```bash
docker-compose -f docker-compose.prod.yml up -d postgres redis
sleep 10
```

6. **Restore database:**

```bash
./scripts/restore-db.sh
```

7. **Restore storage:**

Follow the [Storage Restore](#storage-restore) procedure above

8. **Start all services:**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

9. **Verify system health:**

```bash
./scripts/health-check.sh
```

---

## Automation

### Setting Up Automated Backups

1. **Create logs directory:**

```bash
mkdir -p logs
```

2. **Edit crontab template:**

```bash
cp scripts/crontab.example scripts/crontab.local
# Edit scripts/crontab.local
# Update IIOT_HOME to your installation path
nano scripts/crontab.local
```

3. **Install cron jobs:**

```bash
crontab < scripts/crontab.local
```

4. **Verify installation:**

```bash
crontab -l
```

### Default Schedule

The example crontab includes:
- **Daily database backup** at 2:00 AM
- **Weekly storage backup** every Sunday at 3:00 AM
- **Daily Docker cleanup** at 4:00 AM
- **Weekly database optimization** every Sunday at 5:00 AM
- **Monthly log rotation**

### Monitoring Backup Jobs

Check cron job logs:

```bash
# Database backup log
tail -f logs/backup-db.log

# Storage backup log
tail -f logs/backup-storage.log
```

---

## Best Practices

### Backup Strategy

1. **Follow the 3-2-1 Rule:**
   - Keep **3** copies of data
   - Store on **2** different media types
   - Keep **1** copy offsite

2. **Test Restores Regularly:**
   - Perform test restores monthly
   - Verify data integrity
   - Document restore times

3. **Monitor Backup Success:**
   - Check logs regularly
   - Set up alerts for failed backups
   - Verify backup file sizes

### Retention Policies

Default retention: **30 days**

To change retention, edit the scripts:

```bash
# In backup-db.sh and backup-storage.sh
RETENTION_DAYS=90  # Change to desired value
```

Recommended retention based on data criticality:
- **Production**: 90 days minimum
- **Staging**: 30 days
- **Development**: 7 days

### Offsite Backup

To copy backups to a remote server:

```bash
# Using rsync
rsync -avz --delete ./backups/ user@backup-server:/backups/iiot-intelligence/

# Using scp
scp -r ./backups/* user@backup-server:/backups/iiot-intelligence/
```

Add to crontab for automation:

```cron
# Daily offsite backup at 6:00 AM
0 6 * * * rsync -avz --delete /path/to/iiot-intelligence/backups/ user@backup-server:/backups/iiot-intelligence/ >> /path/to/iiot-intelligence/logs/offsite-backup.log 2>&1
```

### Security Considerations

1. **Protect backup files:**

```bash
# Set restrictive permissions
chmod 600 ./backups/database/*.sql.gz
chmod 700 ./backups
```

2. **Encrypt sensitive backups:**

```bash
# Encrypt database backup
gpg --symmetric --cipher-algo AES256 ./backups/database/iiot_db_backup_*.sql.gz
```

3. **Secure remote transfers:**
   - Use SSH keys for authentication
   - Enable firewall rules
   - Use VPN for offsite transfers

### Backup Verification

Regularly verify backup integrity:

```bash
# Test database backup
gunzip < ./backups/database/iiot_db_backup_*.sql.gz | head -n 20

# Check storage backup contents
tar -tzf ./backups/storage/iiot_storage_backup_*.tar.gz | head -n 20
```

---

## Troubleshooting

### Backup Fails

**Database backup fails:**
- Check if PostgreSQL container is running: `docker ps | grep postgres`
- Verify disk space: `df -h`
- Check logs: `./scripts/logs.sh postgres`

**Storage backup fails:**
- Verify Docker volumes exist: `docker volume ls`
- Check disk space: `df -h`
- Ensure Docker daemon is running

### Restore Fails

**Database restore fails:**
- Check PostgreSQL version compatibility
- Verify backup file is not corrupted: `gunzip -t backup.sql.gz`
- Ensure database exists
- Check user permissions

**Storage restore fails:**
- Verify volume names match
- Check tar file integrity: `tar -tzf backup.tar.gz > /dev/null`
- Ensure sufficient disk space

---

## Getting Help

For issues or questions:
- Check application logs: `./scripts/logs.sh`
- Run health check: `./scripts/health-check.sh`
- Review deployment documentation: `docs/deployment.md`

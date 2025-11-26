# IIoT Account Intelligence - Administrator Guide

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [User Management](#user-management)
3. [LLM Configuration](#llm-configuration)
4. [Webex Bot Setup](#webex-bot-setup)
5. [System Settings](#system-settings)
6. [Monitoring & Analytics](#monitoring--analytics)
7. [Prompt Management](#prompt-management)
8. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### First Login

**Default Admin Credentials** (change immediately):
- Email: `admin@example.com`
- Password: `admin123`

### Initial Configuration Checklist

- [ ] Change default admin password
- [ ] Create additional admin users
- [ ] Configure OpenAI API key
- [ ] Configure X.ai API key (optional)
- [ ] Set up Webex Bot (optional)
- [ ] Review system settings
- [ ] Test report generation
- [ ] Test podcast generation
- [ ] Create user accounts

---

## User Management

### Accessing User Management

1. Log in as admin
2. Navigate to **Users** page (sidebar)

### Creating Users

1. Click **"Add User"**
2. Enter user details:
   - **Full Name**: User's display name
   - **Email**: Must be unique, used for login
   - **Password**: Minimum 8 characters
   - **Role**: USER or ADMIN
3. Click **"Create User"**

### User Roles

| Role | Permissions |
|------|-------------|
| **USER** | Create reports, manage own templates/schedules, view analytics |
| **ADMIN** | All USER permissions + user management + system configuration |

### Managing Users

**Edit User**:
- Update name, email, or role
- Reset password
- View user activity

**Deactivate User**:
- Temporarily disable account
- User cannot log in but data is preserved
- Can be reactivated later

**Delete User**:
- Permanently remove user
- All user's templates and schedules are deleted
- Generated reports are preserved

### Viewing User Activity

1. Go to Users page
2. Click on user name
3. View **Activity Log**:
   - Login history
   - Reports generated
   - Templates created
   - Schedules configured

---

## LLM Configuration

### Accessing LLM Settings

Navigate to **Admin** → **LLM Configuration**

### OpenAI Configuration

1. **API Key**:
   - Obtain from: https://platform.openai.com/api-keys
   - Click "Add OpenAI API Key"
   - Paste key (starts with `sk-`)
   - Click "Save"

2. **Default Model**:
   - `gpt-4`: Most capable, higher cost
   - `gpt-4-turbo`: Faster, lower cost
   - `gpt-4o`: Optimized version

3. **Test Connection**:
   - Click "Test Connection"
   - Verify success message

### X.ai (Grok) Configuration

1. **API Key**:
   - Obtain from: https://x.ai/
   - Add key in admin panel
   - Uses OpenAI-compatible format

2. **Model**: `grok-2-latest`

### Provider Priority

**Primary Provider**: Used for all requests
**Fallback Provider**: Used if primary fails

**Recommended Setup**:
- Primary: OpenAI (gpt-4)
- Fallback: X.ai (grok-2-latest)

### LLM Parameters

| Parameter | Description | Default | Range |
|-----------|-------------|---------|-------|
| Temperature | Creativity/randomness | 0.7 | 0.0-2.0 |
| Max Tokens | Response length limit | 4000 | 100-16000 |
| Timeout | Request timeout (ms) | 60000 | 10000-180000 |
| Max Retries | Failure retry attempts | 3 | 1-5 |

### Cost Management

**Monitoring Usage**:
- View Analytics → API Costs
- Track per-user consumption
- Set usage alerts (future feature)

**Estimated Costs per Report**:
- Brief Account Intelligence: $0.10-0.20
- Standard Competitive Intelligence: $0.30-0.50
- Detailed News Digest: $0.40-0.60
- Podcast (10 min): $0.30-0.50 additional

---

## Webex Bot Setup

### Creating a Webex Bot

1. Go to: https://developer.webex.com/my-apps/new/bot
2. Fill in bot details:
   - **Bot Name**: "IIoT Intelligence Bot"
   - **Bot Username**: Choose unique name
   - **Icon**: Upload company logo
   - **Description**: Brief description
3. Click **"Add Bot"**
4. **Copy Bot Access Token** (shown once)

### Configuring Bot in Application

1. Navigate to **Admin** → **Webex Configuration**
2. Paste **Bot Access Token**
3. Click **"Save"**
4. Click **"Test Connection"**

### Testing Bot Delivery

1. Create a test report
2. Click **"Deliver"** → **"Webex"**
3. Enter your email address
4. Send report
5. Check Webex for 1:1 message from bot

### Bot Permissions

The bot needs:
- `spark:messages_write`: Send messages
- `spark:rooms_read`: Access room information
- `spark:memberships_read`: Verify room membership

### Troubleshooting Bot Issues

**Bot not sending messages**:
- Verify token is correct
- Check token hasn't expired
- Ensure user is reachable in Webex
- Check backend logs for errors

**Bot can't access room**:
- Verify bot is added to the room
- Room ID is correct format
- User has permission to add bots

---

## System Settings

### Report Settings

**Report Retention**:
- **Default**: 90 days
- **Range**: 30-365 days
- Older reports automatically deleted

**Storage Path**:
- Default: `/app/storage/reports`
- Ensure sufficient disk space
- Monitor with analytics dashboard

**File Size Limits**:
- Max upload: 10 MB
- Reports typically: 500 KB - 5 MB
- Podcasts: 2 MB - 20 MB

### Podcast Settings

**Default Template**: Executive Brief

**Audio Quality**:
- Standard: 64 kbps (smaller files)
- High: 192 kbps (better quality) ← Current default

**Voice Providers**:
- OpenAI TTS (6 voices available)
- Future: Additional providers

### Rate Limiting

Protect against abuse:

| Limit Type | Default | Configurable |
|------------|---------|--------------|
| API requests/min | 100 | Yes |
| Reports/user/day | 50 | Yes |
| Concurrent reports | 5 | Yes |

### Scheduled Job Settings

**Report Generation**:
- Processor runs every minute
- Checks for due schedules
- Generates reports automatically

**Cleanup Jobs**:
- Expired reports: Daily at 2 AM
- Temporary files: Daily at 3 AM
- Old logs: Weekly

---

## Monitoring & Analytics

### System Dashboard

Navigate to **Analytics** to view:

**Overview Cards**:
- Total Reports Generated
- Active Users
- Active Schedules
- Success Rate

**Charts**:
- Report generation trends (last 30 days)
- Workflow type distribution
- Most active users
- Peak usage times

### Report Analytics

**Per-Workflow Metrics**:
- Total generated
- Average generation time
- Success/failure rate
- Popular sections

**User Engagement**:
- Reports per user
- Template usage
- Schedule adoption
- Feature usage

### System Health

**Monitor**:
- Database size and connections
- Redis memory usage
- Storage disk space
- API response times

**Alerts** (configure monitoring tool):
- Disk space < 10%
- High error rate (> 5%)
- Slow response times (> 2s)
- Database connection issues

---

## Prompt Management

### Accessing Prompts

Navigate to **Admin** → **Prompts**

### What are Prompts?

System prompts define how LLMs generate content for:
- Report sections
- Podcast scripts
- Data enrichment

### Viewing Prompts

**Filters**:
- By workflow type
- By section
- By active/inactive status

**Prompt Details**:
- Name and description
- System prompt text
- Associated workflow/section
- Version history

### Editing Prompts

1. Click on prompt name
2. Click **"Create New Version"**
3. Edit prompt text
4. Add version notes
5. Click **"Save Draft"** or **"Activate"**

**Best Practices**:
- Test in draft mode first
- Use clear, specific instructions
- Include example outputs
- Version changes with notes

### Prompt Versioning

- All changes create new versions
- Previous versions preserved
- Can rollback to any version
- Track who made changes and when

---

## Troubleshooting

### Reports Failing to Generate

**Check**:
1. LLM API key validity
2. Sufficient API credits
3. Backend logs: `docker-compose logs backend`
4. Network connectivity to API endpoints

**Common Causes**:
- Invalid API key
- Rate limit exceeded
- Timeout (increase in settings)
- Invalid company name

### Podcast Generation Failures

**Check**:
1. FFmpeg installed: `docker exec backend ffmpeg -version`
2. OpenAI TTS access enabled
3. Sufficient disk space
4. Backend logs for errors

**Common Causes**:
- TTS API not enabled
- Audio processing timeout
- Disk space full
- Invalid podcast configuration

### Webex Delivery Failures

**Check**:
1. Bot token is valid
2. Bot added to target room
3. User email/room ID correct
4. Backend logs for API errors

### Database Issues

**Backup First**: Always backup before troubleshooting

**Common Issues**:
- Connection pool exhausted → Increase pool size
- Slow queries → Add indexes
- Disk space full → Clean old reports

**Database Maintenance**:
```bash
# Vacuum database
docker-compose exec postgres psql -U postgres -d iiot_intelligence -c "VACUUM ANALYZE"

# Check database size
docker-compose exec postgres psql -U postgres -d iiot_intelligence -c "SELECT pg_size_pretty(pg_database_size('iiot_intelligence'))"
```

### High API Costs

**Investigate**:
1. Check Analytics → API Usage
2. Identify high-usage users
3. Review report depth settings
4. Consider switching to X.ai fallback

**Cost Reduction Strategies**:
- Use "Brief" depth by default
- Limit podcast generation
- Implement user quotas
- Cache enrichment data

---

## Best Practices

### Security

- Rotate API keys quarterly
- Use strong admin passwords
- Enable 2FA (when available)
- Regular security audits
- Monitor user activity logs

### Performance

- Monitor database size weekly
- Clean expired reports monthly
- Archive old logs
- Optimize slow queries
- Scale resources as needed

### User Training

- Provide user guide
- Create video tutorials
- Offer live training sessions
- Share best practices
- Collect user feedback

### Backup Strategy

- Daily database backups
- Weekly storage backups
- Test restore procedures
- Off-site backup copies
- Document recovery process

---

## Contact & Support

For technical issues:
- Check deployment guide
- Review application logs
- Consult troubleshooting section
- Open GitHub issue

**Last Updated**: 2025-11-26

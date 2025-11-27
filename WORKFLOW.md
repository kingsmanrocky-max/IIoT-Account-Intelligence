# Development & Deployment Workflow

## Quick Start for Development

### Daily Development (3 steps)

1. **Start local environment**
   ```bash
   docker-compose up -d
   ```

2. **Start backend** (new terminal)
   ```bash
   cd backend
   npm run dev
   ```

3. **Start frontend** (new terminal)
   ```bash
   cd frontend
   npm run dev
   ```

Access your app at http://localhost:4000

### Saving Your Work

```bash
git add .
git commit -m "Brief description of changes"
git push
```

## Deployment to Production

### One Command to Deploy

```bash
deploy.bat
```

This script will:
- Commit and push your code to GitHub
- SSH into the GCP VM
- Pull latest code
- Rebuild Docker containers
- Run database migrations
- Show deployment status

### Other Helpful Commands

**Check production status:**
```bash
check-status.bat
```

**View production logs:**
```bash
view-logs.bat
```

**Stop local databases:**
```bash
docker-compose down
```

## Your Production Server

- **URL**: https://35.193.254.12
- **VM Instance**: iiot-intelligence
- **Location**: us-central1-a
- **App Path**: /opt/iiot-app

## Troubleshooting

### Backend won't start locally
1. Make sure Docker is running
2. Check if PostgreSQL container is healthy: `docker ps`
3. Look for error messages in the backend terminal

### Deploy failed
1. Run `check-status.bat` to see container status
2. Run `view-logs.bat` to see error details
3. Try running `deploy.bat` again

### Changes not showing in production
1. Verify everything is committed: `git status`
2. Verify it's pushed: `git push`
3. Run `deploy.bat` again

## Need More Help?

See the full documentation:
- `README.md` - Project overview
- `SETUP_GUIDE.md` - Detailed setup
- `TECHNICAL_SPECIFICATIONS.md` - Technical details
- `deploy/gcp/README.md` - GCP deployment details

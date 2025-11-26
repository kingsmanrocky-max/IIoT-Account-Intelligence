# IIoT Account Intelligence - GCP Compute Engine Deployment

This directory contains deployment scripts and configuration for deploying the IIoT Account Intelligence application to Google Cloud Platform (GCP) Compute Engine.

## Overview

The application is deployed as a multi-container Docker Compose setup on an Ubuntu VM running in GCP Compute Engine. This approach allows you to run the entire application stack (PostgreSQL, Redis, Backend, Frontend, Nginx) on a single VM with persistent storage.

## Architecture

- **VM Type**: e2-medium (2 vCPU, 4GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Region**: us-central1-a
- **Storage**: 30GB boot disk + Docker volumes
- **Network**: External IP with firewall rules for ports 80/443
- **SSL**: Self-signed certificate (upgradeable to Let's Encrypt)

## Cost Estimate

| Resource | Monthly Cost |
|----------|--------------|
| e2-medium VM | ~$25 |
| 30GB boot disk | ~$3 |
| Network egress | ~$1-5 |
| **Total** | **~$30/month** |

## Prerequisites

1. **GCP Account** with billing enabled
2. **GCP Project** created
3. **gcloud CLI** installed and authenticated
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
4. **GitHub Repository** access (to clone during deployment)

## Files in This Directory

- `startup.sh` - VM initialization script (runs on first boot)
- `deploy.sh` - Local deployment script (creates VM and resources)
- `.env.template` - Environment variable template
- `README.md` - This file

## Quick Start

### 1. Update GitHub Repository URL

Edit `startup.sh` and replace `YOUR_USERNAME` with your GitHub username:

```bash
git clone https://github.com/YOUR_USERNAME/IIoT-Account-Intelligence.git .
```

### 2. Make Deploy Script Executable

```bash
chmod +x deploy/gcp/deploy.sh
```

### 3. Run Deployment

```bash
./deploy/gcp/deploy.sh YOUR_PROJECT_ID
```

The script will prompt you for:
- PostgreSQL password (16+ characters)
- JWT secret (32+ characters)
- Encryption key (64 hex characters)
- OpenAI API key

**Tip**: Generate secure values with:
```bash
# PostgreSQL password
openssl rand -base64 32

# JWT secret
openssl rand -base64 32

# Encryption key
openssl rand -hex 32
```

### 4. Wait for Deployment

The VM will take approximately 5-10 minutes to:
1. Install Docker and Docker Compose
2. Clone the repository
3. Build and start all containers
4. Run database migrations

### 5. Access the Application

Once deployment completes, access your application at:

```
https://YOUR_EXTERNAL_IP
```

You'll need to accept the self-signed certificate warning in your browser.

## Post-Deployment Tasks

### Create Admin User

SSH into the VM and run the seed script:

```bash
gcloud compute ssh iiot-intelligence --zone=us-central1-a
sudo docker exec -it iiot-backend-prod npm run seed
```

This creates a default admin user:
- Email: `admin@example.com`
- Password: `admin123` (change immediately!)

### Monitor Services

**Check all containers are running:**
```bash
gcloud compute ssh iiot-intelligence --zone=us-central1-a --command='sudo docker ps'
```

**View logs:**
```bash
gcloud compute ssh iiot-intelligence --zone=us-central1-a --command='sudo docker-compose -f /opt/iiot-app/docker-compose.prod.yml logs -f'
```

**View specific service logs:**
```bash
# Backend
sudo docker logs iiot-backend-prod -f

# Frontend
sudo docker logs iiot-frontend-prod -f

# Nginx
sudo docker logs iiot-nginx-prod -f

# PostgreSQL
sudo docker logs iiot-postgres-prod -f
```

### Restart Services

If you need to restart the application:

```bash
gcloud compute ssh iiot-intelligence --zone=us-central1-a
cd /opt/iiot-app
sudo docker-compose -f docker-compose.prod.yml restart
```

### Update Environment Variables

1. SSH into the VM:
   ```bash
   gcloud compute ssh iiot-intelligence --zone=us-central1-a
   ```

2. Edit the backend .env file:
   ```bash
   sudo nano /opt/iiot-app/backend/.env
   ```

3. Restart services:
   ```bash
   cd /opt/iiot-app
   sudo docker-compose -f docker-compose.prod.yml restart
   ```

## Upgrading to Let's Encrypt SSL

Once you have a domain name pointing to your VM's external IP:

### 1. Install Certbot

```bash
gcloud compute ssh iiot-intelligence --zone=us-central1-a
sudo apt-get update
sudo apt-get install -y certbot
```

### 2. Stop Nginx Temporarily

```bash
cd /opt/iiot-app
sudo docker-compose -f docker-compose.prod.yml stop nginx
```

### 3. Obtain Certificate

```bash
sudo certbot certonly --standalone -d yourdomain.com
```

Follow the prompts to complete certificate issuance.

### 4. Copy Certificates

```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/iiot-app/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/iiot-app/nginx/ssl/
sudo chown root:root /opt/iiot-app/nginx/ssl/*.pem
sudo chmod 644 /opt/iiot-app/nginx/ssl/*.pem
```

### 5. Restart Services

```bash
cd /opt/iiot-app
sudo docker-compose -f docker-compose.prod.yml up -d
```

### 6. Set Up Auto-Renewal

```bash
sudo crontab -e
```

Add this line:
```
0 0 * * 0 certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/*.pem /opt/iiot-app/nginx/ssl/ && docker-compose -f /opt/iiot-app/docker-compose.prod.yml restart nginx
```

## Updating the Application

### Update from Git

```bash
gcloud compute ssh iiot-intelligence --zone=us-central1-a
cd /opt/iiot-app
sudo git pull origin gcp-deployment
sudo docker-compose -f docker-compose.prod.yml up -d --build
```

### Run Database Migrations

```bash
sudo docker exec iiot-backend-prod npm run prisma:migrate
```

## Backup and Restore

### Backup Database

```bash
gcloud compute ssh iiot-intelligence --zone=us-central1-a
sudo docker exec iiot-postgres-prod pg_dump -U iiot_user iiot_intelligence > backup.sql
```

### Restore Database

```bash
sudo docker exec -i iiot-postgres-prod psql -U iiot_user iiot_intelligence < backup.sql
```

## Troubleshooting

### Container won't start

Check logs:
```bash
sudo docker logs iiot-backend-prod --tail 100
sudo docker logs iiot-frontend-prod --tail 100
```

### Database connection errors

Verify PostgreSQL is running:
```bash
sudo docker exec iiot-postgres-prod pg_isready -U iiot_user
```

### SSL certificate errors

Regenerate self-signed certificate:
```bash
cd /opt/iiot-app
sudo rm nginx/ssl/*.pem
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=YOUR_EXTERNAL_IP"
sudo docker-compose -f docker-compose.prod.yml restart nginx
```

### Out of disk space

Check disk usage:
```bash
df -h
sudo docker system prune -a
```

## Scaling and Performance

### Upgrade VM Size

```bash
# Stop VM
gcloud compute instances stop iiot-intelligence --zone=us-central1-a

# Change machine type
gcloud compute instances set-machine-type iiot-intelligence \
  --machine-type=e2-standard-2 \
  --zone=us-central1-a

# Start VM
gcloud compute instances start iiot-intelligence --zone=us-central1-a
```

### Increase Disk Size

```bash
# Increase boot disk
gcloud compute disks resize iiot-intelligence \
  --size=50GB \
  --zone=us-central1-a

# Resize filesystem (SSH into VM)
sudo resize2fs /dev/sda1
```

## Security Best Practices

1. **Change default admin password** immediately after first login
2. **Enable GCP firewall rules** to restrict SSH access to your IP
3. **Regularly update** the VM and containers:
   ```bash
   sudo apt-get update && sudo apt-get upgrade
   sudo docker-compose pull
   ```
4. **Use strong secrets** - see `.env.template` for generation commands
5. **Upgrade to Let's Encrypt** SSL when you have a domain
6. **Enable automatic security updates**:
   ```bash
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

## Teardown

### Stop VM (preserves data, stops billing)

```bash
gcloud compute instances stop iiot-intelligence \
  --project=YOUR_PROJECT_ID \
  --zone=us-central1-a
```

### Delete VM (removes everything)

```bash
gcloud compute instances delete iiot-intelligence \
  --project=YOUR_PROJECT_ID \
  --zone=us-central1-a
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Consult the main project README
4. Open an issue on GitHub

## Additional Resources

- [GCP Compute Engine Docs](https://cloud.google.com/compute/docs)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Let's Encrypt Docs](https://letsencrypt.org/docs/)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)

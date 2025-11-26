#!/bin/bash
set -e

echo "========================================="
echo "IIoT Account Intelligence - GCP VM Setup"
echo "========================================="

# Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker $USER

# Install Docker Compose
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install git
echo "Installing git..."
apt-get update && apt-get install -y git

# Create app directory
echo "Setting up application directory..."
mkdir -p /opt/iiot-app
cd /opt/iiot-app

# Clone repository
echo "Cloning repository..."
# TODO: Update with your GitHub username
git clone https://github.com/YOUR_USERNAME/IIoT-Account-Intelligence.git .
git checkout gcp-deployment

# Retrieve environment variables from GCP metadata
echo "Configuring environment variables..."
POSTGRES_PASSWORD=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/POSTGRES_PASSWORD)
JWT_SECRET=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/JWT_SECRET)
ENCRYPTION_KEY=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/ENCRYPTION_KEY)
OPENAI_API_KEY=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/OPENAI_API_KEY)
EXTERNAL_IP=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)

# Create .env file for backend
cat > backend/.env <<EOF
# Database
POSTGRES_USER=iiot_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=iiot_intelligence
DATABASE_URL=postgresql://iiot_user:${POSTGRES_PASSWORD}@postgres:5432/iiot_intelligence

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=7d
REFRESH_TOKEN_EXPIRATION=30d
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# LLM API Keys
OPENAI_API_KEY=${OPENAI_API_KEY}
XAI_API_KEY=

# URLs
API_URL=https://${EXTERNAL_IP}
FRONTEND_URL=https://${EXTERNAL_IP}

# App settings
NODE_ENV=production
LOG_LEVEL=info
REPORT_RETENTION_DAYS=90

# Ports
PORT=4001
EOF

# Create .env file for frontend
cat > frontend/.env.production <<EOF
NEXT_PUBLIC_API_URL=https://${EXTERNAL_IP}
EOF

# Generate self-signed SSL certificate
echo "Generating self-signed SSL certificate..."
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=${EXTERNAL_IP}"

# Start services
echo "Starting Docker containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo "Waiting for services to initialize..."
sleep 30

# Check if backend is running
echo "Checking backend service..."
docker exec iiot-backend-prod npm run prisma:migrate || echo "Warning: Prisma migration failed. You may need to run it manually."

echo "========================================="
echo "Setup complete!"
echo "Application should be accessible at:"
echo "https://${EXTERNAL_IP}"
echo "(Accept the self-signed certificate warning)"
echo "========================================="

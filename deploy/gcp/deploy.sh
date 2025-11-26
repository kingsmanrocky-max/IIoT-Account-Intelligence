#!/bin/bash
# IIoT Account Intelligence - GCP Compute Engine Deployment Script
# Run from local machine to deploy to GCP

set -e

# Configuration
PROJECT_ID="${1:-YOUR_PROJECT_ID}"
ZONE="us-central1-a"
INSTANCE_NAME="iiot-intelligence"
MACHINE_TYPE="e2-medium"
BOOT_DISK_SIZE="30GB"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "IIoT Account Intelligence Deployment"
echo "========================================="
echo ""

# Validate project ID
if [ "$PROJECT_ID" == "YOUR_PROJECT_ID" ]; then
  echo -e "${RED}Error: Please provide your GCP project ID${NC}"
  echo "Usage: ./deploy.sh YOUR_PROJECT_ID"
  exit 1
fi

echo "Project ID: $PROJECT_ID"
echo "Zone: $ZONE"
echo "Instance: $INSTANCE_NAME"
echo "Machine Type: $MACHINE_TYPE"
echo ""

# Prompt for sensitive information
echo -e "${YELLOW}Please provide the following secrets:${NC}"
echo ""

read -sp "PostgreSQL Password (32+ chars recommended): " POSTGRES_PASSWORD
echo ""

read -sp "JWT Secret (32+ chars required): " JWT_SECRET
echo ""

read -sp "Encryption Key (64 hex chars for AES-256): " ENCRYPTION_KEY
echo ""

read -sp "OpenAI API Key (sk-...): " OPENAI_API_KEY
echo ""
echo ""

# Validate inputs
if [ ${#POSTGRES_PASSWORD} -lt 16 ]; then
  echo -e "${RED}Error: PostgreSQL password too short${NC}"
  exit 1
fi

if [ ${#JWT_SECRET} -lt 32 ]; then
  echo -e "${RED}Error: JWT secret must be at least 32 characters${NC}"
  exit 1
fi

if [ ${#ENCRYPTION_KEY} -ne 64 ]; then
  echo -e "${YELLOW}Warning: Encryption key should be exactly 64 hex characters${NC}"
fi

if [[ ! $OPENAI_API_KEY =~ ^sk- ]]; then
  echo -e "${YELLOW}Warning: OpenAI API key format may be invalid${NC}"
fi

echo -e "${GREEN}Secrets validated successfully${NC}"
echo ""

# Set project
echo "Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required GCP APIs..."
gcloud services enable compute.googleapis.com

# Create firewall rules (if not exist)
echo "Creating firewall rules..."
gcloud compute firewall-rules create allow-http-https \
  --project=$PROJECT_ID \
  --allow=tcp:80,tcp:443 \
  --target-tags=http-server,https-server \
  --description="Allow HTTP and HTTPS traffic" 2>/dev/null || echo "Firewall rule already exists"

# Create VM instance
echo ""
echo "Creating VM instance..."
gcloud compute instances create $INSTANCE_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=$MACHINE_TYPE \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=$BOOT_DISK_SIZE \
  --boot-disk-type=pd-standard \
  --tags=http-server,https-server \
  --metadata-from-file=startup-script=deploy/gcp/startup.sh \
  --metadata=POSTGRES_PASSWORD="$POSTGRES_PASSWORD",JWT_SECRET="$JWT_SECRET",ENCRYPTION_KEY="$ENCRYPTION_KEY",OPENAI_API_KEY="$OPENAI_API_KEY"

# Get external IP
echo ""
echo "Waiting for VM to start..."
sleep 30

EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

# Print deployment info
echo ""
echo "========================================="
echo -e "${GREEN}Deployment initiated successfully!${NC}"
echo "========================================="
echo ""
echo "External IP: $EXTERNAL_IP"
echo ""
echo "The VM is now installing Docker and starting services."
echo "This process takes approximately 5-10 minutes."
echo ""
echo -e "${YELLOW}Monitor progress:${NC}"
echo "  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo journalctl -f'"
echo ""
echo -e "${YELLOW}Check Docker containers:${NC}"
echo "  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo docker ps'"
echo ""
echo -e "${YELLOW}View application logs:${NC}"
echo "  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo docker-compose -f /opt/iiot-app/docker-compose.prod.yml logs -f'"
echo ""
echo -e "${YELLOW}Once ready, access at:${NC}"
echo "  https://$EXTERNAL_IP"
echo "  (You will need to accept the self-signed certificate warning)"
echo ""
echo -e "${YELLOW}Create initial admin user:${NC}"
echo "  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo docker exec -it iiot-backend-prod npm run seed'"
echo ""
echo "========================================="
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Wait 5-10 minutes for initial setup"
echo "2. Access the application at https://$EXTERNAL_IP"
echo "3. Create your admin user"
echo "4. (Optional) Configure a domain and Let's Encrypt SSL"
echo "========================================="

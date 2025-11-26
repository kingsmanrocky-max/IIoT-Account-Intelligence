#!/bin/bash

# ==============================================
# Self-Signed SSL Certificate Generator
# ==============================================
# For on-premises deployments with internal domains
# For production with public domains, use Let's Encrypt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CERT_DIR="./nginx/ssl"
DAYS_VALID=365
COUNTRY="US"
STATE="State"
CITY="City"
ORG="IIoT Intelligence"
ORG_UNIT="IT"

echo -e "${GREEN}=== Self-Signed SSL Certificate Generator ===${NC}"
echo ""

# Prompt for domain/IP
read -p "Enter your domain name or IP address (e.g., iiot.company.com or 192.168.1.100): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: Domain/IP is required${NC}"
    exit 1
fi

# Create SSL directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$CERT_DIR/fullchain.pem" ] || [ -f "$CERT_DIR/privkey.pem" ]; then
    echo -e "${YELLOW}Warning: Certificates already exist in $CERT_DIR${NC}"
    read -p "Do you want to overwrite them? (yes/no): " OVERWRITE
    if [ "$OVERWRITE" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
fi

echo ""
echo -e "${GREEN}Generating self-signed SSL certificate for: $DOMAIN${NC}"
echo "Valid for: $DAYS_VALID days"
echo ""

# Generate private key and certificate
openssl req -x509 -nodes -days $DAYS_VALID \
    -newkey rsa:2048 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$ORG_UNIT/CN=$DOMAIN"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ SSL certificates generated successfully!${NC}"
    echo ""
    echo "Certificate location: $CERT_DIR/fullchain.pem"
    echo "Private key location: $CERT_DIR/privkey.pem"
    echo ""
    echo -e "${YELLOW}Important Notes:${NC}"
    echo "1. These are self-signed certificates - browsers will show security warnings"
    echo "2. For production with public domains, consider using Let's Encrypt"
    echo "3. Update nginx/nginx.conf to set server_name to: $DOMAIN"
    echo "4. Restart nginx to apply: docker-compose -f docker-compose.prod.yml restart nginx"
    echo ""

    # Set proper permissions
    chmod 600 "$CERT_DIR/privkey.pem"
    chmod 644 "$CERT_DIR/fullchain.pem"

    echo -e "${GREEN}Certificate permissions set${NC}"
else
    echo -e "${RED}Error: Failed to generate certificates${NC}"
    exit 1
fi

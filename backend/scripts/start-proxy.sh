#!/bin/bash

# Cloud SQL Auth Proxy Setup Script for Local Development
# This script helps you download and run the Cloud SQL Auth Proxy

# Configuration from .env
INSTANCE_CONNECTION_NAME="group-study-idle-app:us-central1:study-garden-psql-db"
PROXY_PORT=5432

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Cloud SQL Auth Proxy Setup${NC}"
echo "================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}Warning: Not authenticated with gcloud.${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Check if Cloud SQL Auth Proxy exists
if [ ! -f "./cloud-sql-proxy" ]; then
    echo "Downloading Cloud SQL Auth Proxy..."
    
    # Detect OS and architecture
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    if [ "$ARCH" = "x86_64" ]; then
        ARCH="amd64"
    elif [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
        ARCH="arm64"
    fi
    
    PROXY_URL="https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.0/cloud-sql-proxy.${OS}.${ARCH}"
    
    curl -o cloud-sql-proxy "$PROXY_URL"
    chmod +x cloud-sql-proxy
    
    echo -e "${GREEN}Cloud SQL Auth Proxy downloaded successfully!${NC}"
fi

echo -e "${YELLOW}Starting Cloud SQL Auth Proxy...${NC}"
echo "Instance: $INSTANCE_CONNECTION_NAME"
echo "Port: $PROXY_PORT"
echo ""
echo -e "${YELLOW}Note: Keep this terminal open while developing.${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the proxy.${NC}"
echo ""

# Start the proxy
./cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" --port "$PROXY_PORT"

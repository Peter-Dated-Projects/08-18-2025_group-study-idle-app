#!/bin/bash

# MinIO Storage Reset Script (Shell Version)
# Quick and simple reset using MinIO CLI (mc)

set -e

# Configuration
MINIO_ALIAS="${MINIO_ALIAS:-myminio}"
BUCKET_NAME="${BUCKET_NAME:-study-garden-bucket}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "============================================================"
echo "MinIO Storage Reset Script"
echo "============================================================"

# Check if mc is installed
if ! command -v mc &> /dev/null; then
    echo -e "${RED}❌ MinIO Client (mc) is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  macOS: brew install minio/stable/mc"
    echo "  Linux: wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ MinIO Client (mc) found${NC}"

# Configure MinIO alias
echo ""
echo -e "${BLUE}🔧 Configuring MinIO connection...${NC}"
mc alias set "$MINIO_ALIAS" "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connected to MinIO at $MINIO_ENDPOINT${NC}"
else
    echo -e "${RED}❌ Failed to connect to MinIO${NC}"
    exit 1
fi

# List current objects
echo ""
echo -e "${BLUE}📋 Current objects in bucket '$BUCKET_NAME':${NC}"
OBJECT_COUNT=$(mc ls "$MINIO_ALIAS/$BUCKET_NAME" 2>/dev/null | wc -l | tr -d ' ')

if [ "$OBJECT_COUNT" -eq 0 ]; then
    echo -e "   ${YELLOW}No objects found${NC}"
else
    mc ls "$MINIO_ALIAS/$BUCKET_NAME"
    echo -e "   ${BLUE}Total: $OBJECT_COUNT objects${NC}"
fi

# Confirm deletion
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will delete ALL objects in the bucket!${NC}"
read -p "Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}❌ Operation cancelled${NC}"
    exit 0
fi

# Delete all objects
echo ""
echo -e "${BLUE}🗑️  Deleting all objects...${NC}"

# Use recursive remove
mc rm --recursive --force "$MINIO_ALIAS/$BUCKET_NAME/" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All objects deleted successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Some objects may have failed to delete${NC}"
fi

# Upload default profile picture if it exists
if [ -f "default_pfp.png" ]; then
    echo ""
    echo -e "${BLUE}📤 Uploading default profile picture...${NC}"
    mc cp default_pfp.png "$MINIO_ALIAS/$BUCKET_NAME/default_pfp.png"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Default profile picture uploaded${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to upload default picture${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  default_pfp.png not found, skipping upload${NC}"
fi

# Show final state
echo ""
echo "============================================================"
echo -e "${BLUE}📊 Final State:${NC}"
echo "============================================================"
FINAL_COUNT=$(mc ls "$MINIO_ALIAS/$BUCKET_NAME" 2>/dev/null | wc -l | tr -d ' ')

if [ "$FINAL_COUNT" -eq 0 ]; then
    echo -e "   ${YELLOW}Bucket is empty${NC}"
else
    mc ls "$MINIO_ALIAS/$BUCKET_NAME"
    echo -e "   ${BLUE}Total: $FINAL_COUNT objects${NC}"
fi

echo ""
echo "============================================================"
echo -e "${GREEN}✅ Reset Complete!${NC}"
echo "============================================================"

#!/bin/bash

# Quick script to create the study-garden-bucket using Docker

echo "============================================================"
echo "Creating study-garden-bucket in MinIO"
echo "============================================================"

# Check if MinIO container is running
if ! docker ps | grep -q studygarden-minio; then
    echo "❌ Error: MinIO container (studygarden-minio) is not running"
    echo "Start it with: docker-compose up -d studygarden-minio"
    exit 1
fi

echo "✅ MinIO container is running"

# Install mc (MinIO Client) inside the container if not present
echo "📦 Installing MinIO client in container..."
docker exec studygarden-minio sh -c "
    # Check if mc is installed, if not download it
    if ! command -v mc &> /dev/null; then
        wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
        chmod +x /usr/local/bin/mc
    fi
"

# Configure mc alias and create bucket
echo "🔧 Configuring MinIO and creating bucket..."
docker exec studygarden-minio sh -c "
    # Configure mc
    mc alias set local http://localhost:9000 minioadmin minioadmin
    
    # Create bucket if it doesn't exist
    if mc ls local/study-garden-bucket 2>/dev/null; then
        echo '✅ Bucket study-garden-bucket already exists'
    else
        mc mb local/study-garden-bucket
        echo '✅ Created bucket: study-garden-bucket'
    fi
    
    # Set bucket policy to public-read (optional, for easier access)
    # mc anonymous set download local/study-garden-bucket
    
    # List buckets
    echo ''
    echo '📋 All buckets:'
    mc ls local/
"

echo ""
echo "============================================================"
echo "✅ Done! Bucket study-garden-bucket is ready"
echo "============================================================"

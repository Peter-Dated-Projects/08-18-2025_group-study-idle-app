#!/bin/bash

# Script to update all backend URL references to use centralized configuration
# Run this from the frontend directory: ./update_remaining_backend_urls.sh

echo "🔄 Updating backend URL references to use centralized configuration..."

# Array of API route files that need updating
files=(
  "src/app/api/friends/add/route.ts"
  "src/app/api/friends/list/[userId]/route.ts" 
  "src/app/api/friends/remove/route.ts"
  "src/app/api/groups/create/route.ts"
  "src/app/api/groups/details/[groupId]/route.ts"
  "src/app/api/groups/join/route.ts"
  "src/app/api/groups/leave/route.ts"
  "src/app/api/groups/manage/route.ts"
  "src/app/api/hosting/close/route.ts"
  "src/app/api/hosting/create/route.ts"
  "src/app/api/hosting/end/route.ts"
  "src/app/api/hosting/join/route.ts"
  "src/app/api/hosting/leave/route.ts"
  "src/app/api/hosting/status/route.ts"
  "src/app/api/leaderboard/update/route.ts"
)

# Update each file
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Updating $file..."
    
    # Add import if not already present
    if ! grep -q "import.*BACKEND_URL.*from.*@/config/api" "$file"; then
      # Add the import after the existing imports
      sed -i '' '/^import.*from "next\/server";$/a\
import { BACKEND_URL } from "@/config/api";
' "$file"
    fi
    
    # Replace the hardcoded BACKEND_URL declaration
    sed -i '' 's/const BACKEND_URL = process\.env\.BACKEND_URL || "http:\/\/localhost:8000";/const backendURL = BACKEND_URL;/' "$file"
    
    # Replace all BACKEND_URL references with backendURL
    sed -i '' 's/\${BACKEND_URL}/\${backendURL}/g' "$file"
    
    echo "✅ Updated $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo ""
echo "🎉 Backend URL update complete!"
echo ""
echo "📋 Summary of changes:"
echo "  • Added centralized API configuration import"
echo "  • Replaced hardcoded backend URLs with environment variables"
echo "  • Updated WebSocketManager to use centralized config"
echo "  • Created .env.example with configuration templates"
echo ""
echo "📝 Next steps:"
echo "  1. Copy .env.example to .env.local"
echo "  2. Update NEXT_PUBLIC_BACKEND_URL in .env.local with your backend URL"
echo "  3. For production, update environment variables in your deployment platform"
echo ""

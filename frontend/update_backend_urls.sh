#!/bin/bash

# Script to update all backend URL references to use centralized config

FRONTEND_DIR="/Users/petthepotat/Documents/code/dated-projects/08-18-2025_group-study-idle-app/frontend"

# Update all API route files
find "$FRONTEND_DIR/src/app/api" -name "*.ts" -type f -exec sed -i '' \
  -e '1s/^/import { BACKEND_URL } from "@\/config\/api";\n/' \
  -e 's/const BACKEND_URL = process\.env\.BACKEND_URL || "http:\/\/localhost:8000";/const backendURL = BACKEND_URL;/' \
  {} \;

echo "Updated all API route files to use centralized backend URL configuration"

# Backend URL Configuration Guide

## Overview

This guide explains the centralized backend URL configuration system that ensures consistent API communication across the entire application.

## Configuration Files

### 1. `/frontend/src/config/api.ts`

Centralized API configuration with environment variable management:

```typescript
// Environment variables with fallbacks
export const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const WEBSOCKET_URL =
  process.env.WEBSOCKET_URL || process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8000";

// Utility functions for consistent API calls
export const createBackendURL = (endpoint: string): string => {
  return `${BACKEND_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
};

export const createAPIRequest = async (endpoint: string, options?: RequestInit) => {
  return fetch(createBackendURL(endpoint), options);
};
```

### 2. Environment Variables

#### Development (.env.local)

```bash
# Backend API URL for client-side requests
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Backend URL for server-side requests
BACKEND_URL=http://localhost:8000

# WebSocket URL for real-time connections
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8000
WEBSOCKET_URL=ws://localhost:8000
```

#### Production

Update these environment variables in your deployment platform:

- `NEXT_PUBLIC_BACKEND_URL`: Public-facing API URL
- `BACKEND_URL`: Internal API URL (may be different from public)
- `NEXT_PUBLIC_WEBSOCKET_URL`: Public WebSocket URL
- `WEBSOCKET_URL`: Internal WebSocket URL

## Architecture Benefits

### 1. Centralized Configuration

- Single source of truth for all backend URLs
- Consistent fallback handling across the application
- Easy environment-specific configuration

### 2. Environment Flexibility

- Different URLs for development, staging, and production
- Support for both public and internal backend endpoints
- WebSocket URL configuration separate from REST API

### 3. Type Safety

- TypeScript utilities for URL construction
- Standardized API request patterns
- Compile-time validation of endpoint usage

## Usage Patterns

### API Routes (`src/app/api/**/route.ts`)

```typescript
import { BACKEND_URL } from "@/config/api";

export async function POST(request: Request) {
  const backendURL = BACKEND_URL;
  const response = await fetch(`${backendURL}/api/endpoint`, {
    method: "POST",
    // ... options
  });
}
```

### Client Components

```typescript
import { createBackendURL, createAPIRequest } from "@/config/api";

// Using utility function
const response = await createAPIRequest("/api/leaderboard");

// Manual URL construction
const url = createBackendURL("/api/groups");
```

### WebSocket Connections

```typescript
import { WEBSOCKET_URL } from "@/config/api";

class WebSocketManager {
  connect() {
    this.socket = new WebSocket(`${WEBSOCKET_URL}/ws`);
  }
}
```

## Migration Status

### ✅ Updated Files

- `/frontend/src/config/api.ts` - Centralized configuration
- `/frontend/src/app/api/leaderboard/global/route.ts`
- `/frontend/src/app/api/leaderboard/group/[groupId]/route.ts`
- `/frontend/src/app/api/leaderboard/user/route.ts`
- `/frontend/src/utils/WebSocketManager.ts`
- `/frontend/.env.example` - Environment template

### 🔄 Automated Migration

Use the provided script to update remaining files:

```bash
cd frontend
./update_remaining_backend_urls.sh
```

### 📋 Files Included in Migration

- Friends API routes (add, list, remove)
- Groups API routes (create, details, join, leave, manage)
- Hosting API routes (create, join, leave, status, close, end)
- Additional leaderboard routes

## Testing Configuration

### 1. Verify Environment Variables

```bash
# Check if variables are loaded
echo $NEXT_PUBLIC_BACKEND_URL
echo $BACKEND_URL
```

### 2. Test API Connectivity

```typescript
import { createAPIRequest } from "@/config/api";

// Test backend connection
try {
  const response = await createAPIRequest("/health");
  console.log("Backend connected:", response.ok);
} catch (error) {
  console.error("Backend connection failed:", error);
}
```

### 3. Validate WebSocket Connection

```typescript
import { WEBSOCKET_URL } from "@/config/api";

const testSocket = new WebSocket(`${WEBSOCKET_URL}/ws/test`);
testSocket.onopen = () => console.log("WebSocket connected");
testSocket.onerror = (error) => console.error("WebSocket error:", error);
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**

   - Ensure `.env.local` exists in frontend directory
   - Restart development server after adding variables
   - Check variable names match exactly (case-sensitive)

2. **CORS Issues**

   - Verify backend CORS configuration allows frontend origin
   - Check if URLs include trailing slashes consistently
   - Ensure protocol (http/https) matches between frontend and backend

3. **WebSocket Connection Failures**
   - Confirm WebSocket URL uses `ws://` or `wss://` protocol
   - Check if backend WebSocket server is running
   - Verify firewall/proxy settings allow WebSocket connections

### Debug Commands

```bash
# Check environment loading
npm run dev -- --inspect

# Verify configuration
node -e "console.log(require('./src/config/api'))"

# Test backend connectivity
curl $NEXT_PUBLIC_BACKEND_URL/health
```

## Security Considerations

1. **Public vs Private URLs**

   - `NEXT_PUBLIC_*` variables are exposed to client-side code
   - Use non-public variables for sensitive internal URLs
   - Never include credentials in environment variables

2. **URL Validation**

   - Validate URLs before use in production
   - Implement URL allowlisting for external APIs
   - Use HTTPS in production environments

3. **Environment Separation**
   - Use different backend URLs for each environment
   - Implement proper SSL certificate validation
   - Monitor for unauthorized API access

## Future Enhancements

1. **Configuration Validation**

   - Add runtime validation for required environment variables
   - Implement URL format validation
   - Create configuration health checks

2. **Advanced Features**

   - Support for multiple backend services
   - Load balancing configuration
   - Circuit breaker patterns for API resilience

3. **Development Tools**
   - Configuration management CLI
   - Automated environment setup scripts
   - Integration testing for all environments

# /src/hooks - Custom React Hooks

## Purpose

Custom React hooks for common patterns and external service integrations.

## Key Hooks

- `useAuth.ts` - Firebase authentication management
- `useSessionAuth.ts` - Session-based authentication state
- `useWebSocket.ts` - WebSocket connection management

## Hook Descriptions

### `useAuth`

- Firebase Google Auth integration
- User state management
- Session creation and storage
- Sign in/out functionality

### `useSessionAuth`

- Session-based user state
- Integrates with API session endpoints
- Provides user info and authentication status

### `useWebSocket`

- Real-time WebSocket connections
- Message handling and state management
- Connection lifecycle management
- Used for live study sessions and notifications

## Agent Notes

- Import hooks directly: `import { useAuth } from "@/hooks/useAuth"`
- Authentication hooks work together (Firebase → Session API)
- WebSocket hook handles reconnection and error states automatically
- Session auth is the primary authentication state for the app
- All hooks follow React hooks rules (only call at component top level)

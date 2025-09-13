# /src/lib - External Service Integrations

## Purpose

Library code for integrating with external services and APIs.

## Key Files

- `firebase.ts` - Firebase configuration and authentication
- `firestore.ts` - Firestore database with encryption utilities
- `notion-api.ts` - Notion API integration for task management
- `notion-datasource-utils.ts` - Notion data source configuration
- `notion-token-refresh.ts` - Notion OAuth token management

## Service Integrations

### Firebase

- Google Authentication provider
- App configuration and initialization
- Auth state management

### Firestore

- Document storage with encryption
- Session data persistence
- Encrypted token storage
- User data management

### Notion API

- Task and database integration
- OAuth flow management
- Token refresh handling
- Page and block operations
- Database queries and filtering

## Agent Notes

- All external API keys should be in environment variables
- Encryption is used for sensitive data storage in Firestore
- Notion integration supports multiple databases per user
- Token refresh is handled automatically for Notion
- Firebase auth integrates with session-based backend auth
- Use these libs for consistent external service access

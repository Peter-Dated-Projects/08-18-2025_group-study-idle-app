# /src/utils - Utility Functions

## Purpose

General utility functions and helpers not specific to external services or React components.

## Structure

- `AvatarSignals.ts` - Avatar signal event definitions
- `WebSocketManager.ts` - WebSocket connection management utility

## Key Utilities

### Avatar Signals

- Event type definitions for avatar system
- Signal constants and enumerations
- Communication protocol between entities

### WebSocket Manager

- WebSocket connection lifecycle
- Message queuing and handling
- Reconnection logic
- Event-based communication layer

## Agent Notes

- Pure functions preferred (no side effects when possible)
- Import specific utilities: `import { WebSocketManager } from "@/utils/WebSocketManager"`
- Utilities should be framework-agnostic where possible
- Complex utilities may warrant their own files
- Consider moving frequently used patterns to /components/common
- Document utility functions with JSDoc comments

# /src/app - Next.js App Router

## Purpose

Contains Next.js 13+ App Router pages and API routes using the new app directory structure.

## Structure

- **Page components** (`page.tsx`) - Main route components
- **Layout components** (`layout.tsx`) - Shared layouts for routes
- **API routes** (`route.ts`) - Server-side API endpoints
- **Client-side routing** - File-based routing system

## Key Files

- `layout.tsx` - Root layout with providers and global styles
- `page.tsx` - Landing/home page
- `garden/page.tsx` - Main garden application page
- `login/page.tsx` - Authentication page

## API Routes

- `/api/auth/*` - Authentication endpoints (login, logout, session)
- `/api/friends/*` - Friend management endpoints
- `/api/groups/*` - Study group management
- `/api/hosting/*` - Lobby/session hosting
- `/api/notion/*` - Notion integration endpoints
- `/api/user-stats/*` - User statistics

## Agent Notes

- Use Next.js App Router conventions
- API routes return JSON responses
- Pages are React Server Components by default
- Use `"use client"` directive for client-side interactivity
- Authentication is handled via session cookies

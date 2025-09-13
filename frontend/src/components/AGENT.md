# /src/components - React UI Components

## Purpose

Reusable React components organized by feature and common utilities.

## Structure

- `common/` - **Shared utilities and components** (hooks, forms, modals, API utils)
- `garden/` - Garden-specific UI components
- `constants.tsx` - Global constants (colors, fonts, assets)
- `NotificationProvider.tsx` - Global notification system
- `Providers.tsx` - React context providers wrapper

## Key Directories

### `/common` (Centralized Utilities)

- **Components**: BaseModal, Button, TextInput, LoadingSpinner, ProfilePicture
- **Hooks**: useMessage, useLoading, useCopyToClipboard
- **Utils**: API utilities, engine math utils, common styles
- **Types**: Shared TypeScript interfaces

### `/garden` (Garden App Components)

- **UI Components**: Settings, Friends, Groups, User Profile modals
- **Canvas**: PIXI.js garden canvas and related components
- **Tools**: Lobby, Timer, Music sync tools
- **Tasks**: Task management components

## Agent Notes

- Import from `@/components/common` for reusable utilities
- UI components follow consistent design system (colors in constants.tsx)
- Modal components use BaseModal for consistency
- Garden components are specific to the main application
- Use hooks from common/ for state management patterns

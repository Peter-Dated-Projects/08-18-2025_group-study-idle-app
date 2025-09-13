# /src/components/common - Shared Utilities & Components

## Purpose

Centralized reusable components, hooks, utilities, and patterns extracted from across the application to reduce code duplication and ensure consistency.

## Structure

- **Components**: BaseModal, Form components, Loading states, Profile components
- **Hooks**: Custom React hooks for common patterns
- **Utils**: API utilities, engine math, styling helpers
- **Types**: Shared TypeScript interfaces
- **Examples**: Refactoring examples showing usage patterns

## Key Files

- `index.ts` - Main export file for easy imports
- `BaseModal.tsx` - Unified modal component used throughout app
- `hooks.ts` - useMessage, useLoading, useCopyToClipboard
- `apiUtils.ts` - Standardized API request handling
- `FormComponents.tsx` - Button, TextInput, FormGroup, InfoDisplay
- `engineUtils.ts` - Math, collision, vector, animation utilities

## Usage Pattern

```tsx
import { BaseModal, Button, useMessage, apiPost, MathUtils } from "@/components/common";
```

## Agent Notes

- **Always check here first** before creating similar utilities
- Follow the established patterns for consistency
- Components use design system colors from constants.tsx
- Hooks provide standardized state management
- API utils handle loading states and error messages automatically
- Examples/ folder shows refactoring patterns for reducing code duplication

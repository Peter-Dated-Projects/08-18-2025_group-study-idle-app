# /src/types - TypeScript Type Definitions

## Purpose

Global TypeScript type definitions and interfaces used across the application.

## Structure

- **Shared interfaces** for data models
- **API response types**
- **Component prop interfaces**
- **External library type extensions**

## Usage Pattern

```tsx
import type { User, TaskData, APIResponse } from "@/types";
```

## Agent Notes

- Define types here for reuse across multiple files
- Follow consistent naming conventions (PascalCase for interfaces)
- Group related types together
- Use generic types for flexible APIs
- Extend external library types when needed
- Export types with explicit `type` keyword for better tree-shaking

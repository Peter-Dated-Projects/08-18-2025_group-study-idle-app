# Common Components and Utilities

This folder contains reusable components, utilities, and patterns extracted from throughout the application.

## Components

### BaseModal

A unified modal component used throughout the application with support for:

- Canvas-constrained positioning
- Customizable headers, footers, and content
- Consistent styling

### Form Components

- `Button` - Styled button with variants (primary, secondary, danger)
- `TextInput` - Consistent text input with optional labels
- `FormGroup` - Container for form elements
- `InfoDisplay` - Display information with optional copy functionality

### Loading Components

- `LoadingSpinner` - Animated loading spinner
- `LoadingOverlay` - Overlay with loading spinner for async operations
- `MessageDisplay` - Success/error message display

### Profile Components

- `ProfilePicture` - Consistent profile picture placeholder
- `UserDisplayName` - User name display with fallbacks
- `UserCard` - Complete user information card

## Hooks

### useMessage()

Manages message state for success/error notifications:

```tsx
const { message, messageType, showMessage, clearMessage } = useMessage();
showMessage("Success!", "success");
```

### useLoading()

Manages loading state with utility function:

```tsx
const { loading, setLoading, withLoading } = useLoading();
const result = await withLoading(async () => await apiCall());
```

### useCopyToClipboard()

Handles clipboard operations:

```tsx
const { copyMessage, copyToClipboard } = useCopyToClipboard();
await copyToClipboard("text to copy");
```

## Utilities

### API Utils

Simplified API request handling:

- `apiGet()`, `apiPost()`, `apiPut()`, `apiDelete()`
- `handleAPICall()` - Combines API calls with loading and message states

### Engine Utils

Mathematical and physics utilities:

- `MathUtils` - Distance, lerp, clamp, random functions
- `CollisionUtils` - Collision detection algorithms
- `VectorUtils` - Vector mathematics
- `AnimationUtils` - Easing and spring animations
- `FileUtils` - File loading utilities

### Styles

Consistent styling objects:

- `commonStyles` - Reusable style definitions
- `hoverEffects` - Hover state styles

## Types

Common TypeScript interfaces:

- `User`, `Friend`, `Group`, `UserStats`
- `MessageState`, `LoadingState`
- `APIResponse`
- `Point`, `Size`, `Rect`, `Vector2D`

## Usage

Import what you need from the common folder:

```tsx
import { BaseModal, Button, useMessage, apiPost, commonStyles } from "@/components/common";
```

## Migration Notes

Components have been extracted from:

- UI modals (FriendsMenu, GroupsModal, UserProfile, GardenSettings)
- Engine utilities (utils.tsx, various math functions)
- Repeated patterns across the codebase

All original functionality is preserved while reducing code duplication.

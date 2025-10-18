# Tutorial System Architecture

## Component Hierarchy

```
App Layout (Root)
│
├── TutorialProvider (Context Provider)
│   │
│   ├── Your App Components
│   │   │
│   │   └── Any Component
│   │       │
│   │       └── useTutorial() hook
│   │           │
│   │           └── startTutorial(config)
│   │
│   └── TutorialManager
│       │
│       └── TutorialOverlay
│           │
│           ├── Backdrop (dark overlay)
│           │   │
│           │   └── Skip Button
│           │
│           └── TutorialStep
│               │
│               ├── Header (title + step counter)
│               ├── Body (description)
│               └── Footer (Back/Next buttons)
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     TutorialProvider                        │
│  State: { currentTutorial, isTutorialActive }              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ Context
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│ Any Component│        │TutorialManager│
│              │        │              │
│ useTutorial()│        │ Renders:     │
│   ├─ start   │        │ TutorialOverlay
│   ├─ stop    │        │              │
│   └─ state   │        └──────────────┘
└──────────────┘                │
                                ▼
                        ┌──────────────┐
                        │TutorialOverlay│
                        │              │
                        │ Manages:     │
                        │ - Step index │
                        │ - Navigation │
                        │ - Callbacks  │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ TutorialStep │
                        │              │
                        │ Handles:     │
                        │ - Positioning│
                        │ - Rendering  │
                        │ - Animation  │
                        └──────────────┘
```

## Positioning Algorithm

```
1. Get target element via selector
   │
   ▼
2. Get target's bounding rect
   │
   ▼
3. Get step's bounding rect
   │
   ▼
4. Calculate position based on 'position' prop:
   │
   ├─ top:    above target, centered horizontally
   ├─ bottom: below target, centered horizontally
   ├─ left:   left of target, centered vertically
   └─ right:  right of target, centered vertically
   │
   ▼
5. Apply offset (if provided)
   │
   ▼
6. Constrain to viewport bounds
   │
   ▼
7. Render at calculated position
```

## Tutorial Lifecycle

```
┌──────────────┐
│  Tutorial    │
│  Created     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ startTutorial│
│  (config)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Step 1      │◄──┐
│  Displayed   │   │
└──────┬───────┘   │
       │           │
       ├─ Next ────┘
       │
       ├─ Back (if not first)
       │
       ├─ Skip (if allowed)
       │     │
       │     ▼
       │   onSkip()
       │
       ▼
┌──────────────┐
│  Last Step   │
└──────┬───────┘
       │
       ├─ Finish
       │     │
       │     ▼
       │   onComplete()
       │
       ▼
┌──────────────┐
│  Tutorial    │
│  Ends        │
└──────────────┘
```

## State Management

```typescript
// TutorialContext State
{
  currentTutorial: TutorialConfig | null,
  isTutorialActive: boolean
}

// TutorialOverlay Local State
{
  currentStepIndex: number,
  isVisible: boolean
}

// TutorialStep Local State
{
  position: { top: number, left: number } | null
}
```

## Event Flow

```
User Action              Component              Effect
───────────              ─────────              ──────

startTutorial(config) ──► TutorialProvider ──► Set state
                                                │
                                                ▼
                                         TutorialManager
                                                │
                                                ▼
                                         Render overlay
                                                │
                                                ▼
                                         Show Step 1
                                                │
Click "Next" ────────────► TutorialOverlay ──► currentStepIndex++
                                                │
                                                ▼
                                         Show next step
                                                │
Click "Finish" ──────────► TutorialOverlay ──► onComplete()
                                                │
                                                ▼
                                         stopTutorial()
                                                │
                                                ▼
                                         Hide overlay
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Login     │  │  Dashboard  │  │   Settings  │       │
│  │   Page      │  │    Page     │  │    Page     │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │                │               │
│         └────────┬───────┴────────┬───────┘               │
│                  │                │                       │
│                  ▼                ▼                       │
│         ┌─────────────────────────────┐                  │
│         │     useTutorial() hook      │                  │
│         │                             │                  │
│         │  - Check user tutorial flag │                  │
│         │  - Start tutorial if needed │                  │
│         │  - Manual replay button     │                  │
│         └──────────────┬──────────────┘                  │
│                        │                                  │
│                        ▼                                  │
│         ┌─────────────────────────┐                      │
│         │   Backend API Call      │                      │
│         │                         │                      │
│         │  PATCH /api/users/me    │                      │
│         │  { finished-tutorial }  │                      │
│         └─────────────────────────┘                      │
│                        │                                  │
│                        ▼                                  │
│         ┌─────────────────────────┐                      │
│         │   ArangoDB Update       │                      │
│         │   users collection      │                      │
│         │   finished-tutorial: true│                     │
│         └─────────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## File Dependencies

```
types.ts
  └─ (standalone, no dependencies)

TutorialStep.tsx
  ├─ types.ts
  └─ ../constants.tsx

TutorialOverlay.tsx
  ├─ TutorialStep.tsx
  └─ types.ts

TutorialContext.tsx
  └─ types.ts

TutorialManager.tsx
  ├─ TutorialOverlay.tsx
  └─ TutorialContext.tsx

index.ts
  ├─ TutorialStep.tsx
  ├─ TutorialOverlay.tsx
  ├─ TutorialManager.tsx
  ├─ TutorialContext.tsx
  └─ types.ts
```

## CSS/Styling Dependencies

```
Tutorial Components
  │
  ├─ PANELFILL ────────► constants.tsx
  ├─ BORDERFILL ───────► constants.tsx
  ├─ BORDERLINE ───────► constants.tsx
  ├─ FONTCOLOR ────────► constants.tsx
  └─ ACCENT_COLOR ─────► constants.tsx
```

## Browser Compatibility

```
✅ Chrome/Edge 90+
✅ Firefox 88+
✅ Safari 14+
✅ Mobile browsers (iOS Safari, Chrome Mobile)
```

Uses standard web APIs:
- `querySelector()` - Target selection
- `getBoundingClientRect()` - Position calculation
- `window.addEventListener()` - Resize/scroll handling
- CSS Transitions - Smooth animations
- Flexbox - Layout

## Performance Considerations

```
Optimizations:
├─ Lazy positioning calculation (only when visible)
├─ RequestAnimationFrame for smooth updates
├─ Event listener cleanup on unmount
├─ Conditional rendering (null if not active)
└─ Lightweight state management

Memory:
├─ Single tutorial active at a time
├─ Event listeners properly cleaned up
└─ No memory leaks in testing
```

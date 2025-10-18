# Tutorial System - Quick Reference

## 📁 Files Created

```
frontend/src/components/tutorial/
├── types.ts                    # TypeScript interfaces
├── TutorialStep.tsx           # Individual step component
├── TutorialOverlay.tsx        # Main overlay system
├── TutorialContext.tsx        # React Context & hook
├── TutorialManager.tsx        # Global tutorial renderer
├── TutorialExamples.tsx       # Usage examples
├── index.ts                   # Public exports
├── README.md                  # Full documentation
└── INTEGRATION_GUIDE.md       # Step-by-step integration
```

## 🚀 Quick Usage

### 1. Basic Setup (in root layout)
```tsx
import { TutorialProvider, TutorialManager } from '@/components/tutorial';

<TutorialProvider>
  {children}
  <TutorialManager />
</TutorialProvider>
```

### 2. Create Tutorial
```tsx
const tutorial = {
  steps: [
    {
      id: 'step-1',
      title: 'Welcome!',
      description: 'This is a tutorial step.',
      targetSelector: '#my-button',
      position: 'bottom',
      highlightTarget: true,
    },
  ],
  onComplete: () => console.log('Done!'),
  allowSkip: true,
};
```

### 3. Start Tutorial
```tsx
const { startTutorial } = useTutorial();
startTutorial(tutorial);
```

## ✨ Key Features

- **Positioning**: `'top' | 'bottom' | 'left' | 'right'`
- **Highlighting**: Automatically highlights target elements
- **Navigation**: Back/Next buttons (auto "Finish" on last step)
- **Responsive**: Stays within viewport bounds
- **Skip Support**: Optional skip button
- **Global State**: React Context for app-wide tutorials

## 📋 Props Reference

### TutorialStep
| Prop | Type | Description |
|------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Step title |
| `description` | string | Step content |
| `targetSelector` | string | CSS selector for positioning |
| `position` | Position | Where to show (top/bottom/left/right) |
| `offset` | {x, y} | Optional pixel offset |
| `highlightTarget` | boolean | Highlight the target element |

### TutorialConfig
| Prop | Type | Description |
|------|------|-------------|
| `steps` | TutorialStep[] | Array of steps |
| `onComplete` | () => void | Callback when finished |
| `onSkip` | () => void | Callback when skipped |
| `allowSkip` | boolean | Show skip button |
| `initialStep` | number | Starting step index |

## 🎯 Integration with Backend

Save completion status:
```tsx
onComplete: async () => {
  await fetch(`${API_URL}/api/users/me`, {
    method: 'PATCH',
    body: JSON.stringify({ 'finished-tutorial': true }),
  });
}
```

## 📖 Documentation

- **README.md** - Complete API documentation and examples
- **INTEGRATION_GUIDE.md** - Step-by-step setup guide
- **TutorialExamples.tsx** - Working code examples

## 🎨 Styling

Uses existing design constants:
- `PANELFILL` - Background
- `BORDERFILL` - Header/footer
- `BORDERLINE` - Borders
- `FONTCOLOR` - Text

## 🧪 Testing

Create test elements with IDs:
```html
<button id="test-button">Click Me</button>
```

Then target them:
```tsx
targetSelector: '#test-button'
```

## ⚡ Next Steps

1. Add `TutorialProvider` to your app layout
2. Create your first tutorial configuration
3. Trigger it on first user login
4. Save completion to backend (`finished-tutorial` field)
5. Test on different screen sizes

See **INTEGRATION_GUIDE.md** for detailed setup instructions!

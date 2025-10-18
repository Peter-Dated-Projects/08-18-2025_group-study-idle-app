# Tutorial System Documentation

A flexible and customizable tutorial/onboarding overlay system for your application. This system allows you to create step-by-step tutorials that guide users through your application with positioned modal-like components.

## Features

- ✨ **Flexible Positioning**: Position tutorial steps relative to any element (top, bottom, left, right)
- 🎯 **Target Highlighting**: Automatically highlight the target elements during tutorials
- 🎨 **Customizable Styling**: Integrates with your existing design system
- 📱 **Responsive**: Automatically adjusts position to stay within viewport
- ⌨️ **Navigation Controls**: Back/Next buttons with automatic "Finish" on last step
- 🔄 **State Management**: Global tutorial state via React Context
- 🎭 **Multiple Modes**: Use as standalone component or with global context
- ⏭️ **Skip Support**: Optional skip functionality

## Installation

The tutorial system is already included in your project at:
```
src/components/tutorial/
```

## Quick Start

### 1. Wrap Your App with TutorialProvider

First, wrap your application with the `TutorialProvider` in your root layout:

```tsx
// src/app/layout.tsx or your root component
import { TutorialProvider } from '@/components/tutorial';
import TutorialManager from '@/components/tutorial/TutorialManager';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TutorialProvider>
          {children}
          <TutorialManager />
        </TutorialProvider>
      </body>
    </html>
  );
}
```

### 2. Create a Tutorial Configuration

```tsx
import { TutorialConfig } from '@/components/tutorial';

const myTutorialConfig: TutorialConfig = {
  steps: [
    {
      id: 'step-1',
      title: 'Welcome!',
      description: 'This is your first tutorial step. Let\'s explore the features!',
      targetSelector: '#welcome-button', // CSS selector
      position: 'bottom', // 'top' | 'bottom' | 'left' | 'right'
      highlightTarget: true, // Optional: highlights the target element
    },
    {
      id: 'step-2',
      title: 'Navigation',
      description: 'Use this menu to navigate through the app.',
      targetSelector: '#nav-menu',
      position: 'right',
      offset: { x: 10, y: 0 }, // Optional: custom offset
      highlightTarget: true,
    },
    // Add more steps...
  ],
  onComplete: () => {
    console.log('Tutorial completed!');
    // Update backend: user finished tutorial
  },
  onSkip: () => {
    console.log('Tutorial skipped');
  },
  allowSkip: true, // Shows skip button
  initialStep: 0, // Optional: start at specific step
};
```

### 3. Start the Tutorial

#### Option A: Using Context (Recommended)

```tsx
import { useTutorial } from '@/components/tutorial';

function MyComponent() {
  const { startTutorial } = useTutorial();

  const handleStartTutorial = () => {
    startTutorial(myTutorialConfig);
  };

  return (
    <button onClick={handleStartTutorial}>
      Start Tutorial
    </button>
  );
}
```

#### Option B: Using Component Directly

```tsx
import { TutorialOverlay } from '@/components/tutorial';
import { useState } from 'react';

function MyComponent() {
  const [isActive, setIsActive] = useState(false);

  return (
    <>
      <button onClick={() => setIsActive(true)}>
        Start Tutorial
      </button>
      
      <TutorialOverlay
        config={myTutorialConfig}
        isActive={isActive}
        onClose={() => setIsActive(false)}
      />
    </>
  );
}
```

## API Reference

### TutorialConfig

```typescript
interface TutorialConfig {
  steps: TutorialStep[];           // Array of tutorial steps
  onComplete?: () => void;          // Callback when tutorial finishes
  onSkip?: () => void;              // Callback when tutorial is skipped
  initialStep?: number;             // Starting step index (default: 0)
  allowSkip?: boolean;              // Show skip button (default: false)
}
```

### TutorialStep

```typescript
interface TutorialStep {
  id: string;                       // Unique identifier
  title: string;                    // Step title
  description: string;              // Step description/content
  targetSelector: string;           // CSS selector for target element
  position: TutorialPosition;       // Position relative to target
  offset?: { x: number; y: number }; // Optional position offset (pixels)
  highlightTarget?: boolean;        // Highlight target element (default: false)
}

type TutorialPosition = 'top' | 'bottom' | 'left' | 'right';
```

### useTutorial Hook

```typescript
const {
  startTutorial,      // (config: TutorialConfig) => void
  stopTutorial,       // () => void
  isTutorialActive,   // boolean
  currentTutorial,    // TutorialConfig | null
} = useTutorial();
```

## Examples

### Example 1: First-Time User Onboarding

```tsx
import { useTutorial } from '@/components/tutorial';
import { useEffect } from 'react';

function App() {
  const { startTutorial } = useTutorial();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user has completed tutorial
    if (user && !user.finishedTutorial) {
      const onboardingConfig = {
        steps: [
          {
            id: 'welcome',
            title: 'Welcome to Study Garden!',
            description: 'Let\'s take a quick tour of the features.',
            targetSelector: '#app-logo',
            position: 'bottom',
            highlightTarget: true,
          },
          {
            id: 'garden',
            title: 'Your Garden',
            description: 'This is where you grow your study plants!',
            targetSelector: '#garden-view',
            position: 'right',
            highlightTarget: true,
          },
          {
            id: 'timer',
            title: 'Study Timer',
            description: 'Start a study session to earn pomos and grow your plants.',
            targetSelector: '#study-timer',
            position: 'bottom',
            highlightTarget: true,
          },
        ],
        onComplete: async () => {
          // Update backend
          await fetch('/api/users/tutorial-complete', {
            method: 'PATCH',
            body: JSON.stringify({ 'finished-tutorial': true }),
          });
        },
        allowSkip: true,
      };

      startTutorial(onboardingConfig);
    }
  }, [user, startTutorial]);

  return <div>{/* Your app */}</div>;
}
```

### Example 2: Feature Announcement Tutorial

```tsx
function NewFeatureAnnouncement() {
  const { startTutorial } = useTutorial();

  const announceNewFeature = () => {
    startTutorial({
      steps: [
        {
          id: 'new-shop',
          title: '🎉 New Feature: Shop!',
          description: 'Check out the new shop where you can buy decorations!',
          targetSelector: '#shop-button',
          position: 'left',
          highlightTarget: true,
        },
      ],
      onComplete: () => {
        localStorage.setItem('new-shop-announcement-seen', 'true');
      },
      allowSkip: true,
    });
  };

  useEffect(() => {
    if (!localStorage.getItem('new-shop-announcement-seen')) {
      announceNewFeature();
    }
  }, []);

  return null;
}
```

### Example 3: Multi-Page Tutorial

```tsx
function MultiPageTutorial() {
  const { startTutorial } = useTutorial();
  const router = useRouter();

  const startFullTour = () => {
    startTutorial({
      steps: [
        {
          id: 'dashboard',
          title: 'Dashboard Overview',
          description: 'This is your main dashboard.',
          targetSelector: '#dashboard',
          position: 'bottom',
        },
        // After showing dashboard, navigate to next page
        {
          id: 'navigate-shop',
          title: 'Let\'s Visit the Shop',
          description: 'Click next to navigate to the shop page.',
          targetSelector: '#shop-link',
          position: 'right',
          highlightTarget: true,
        },
        // These steps will appear after navigation
        {
          id: 'shop-intro',
          title: 'Welcome to the Shop',
          description: 'Here you can purchase items and decorations.',
          targetSelector: '#shop-container',
          position: 'top',
        },
      ],
      onComplete: () => console.log('Full tour completed!'),
      allowSkip: true,
    });
  };

  return <button onClick={startFullTour}>Start Full Tour</button>;
}
```

## Styling

The tutorial system uses your existing design constants:
- `PANELFILL` - Background color
- `BORDERFILL` - Header/footer background
- `BORDERLINE` - Border color
- `FONTCOLOR` - Text color

These are defined in `src/components/constants.tsx`.

## Best Practices

1. **Keep steps concise**: 2-3 sentences max per step
2. **Use meaningful IDs**: Make step IDs descriptive
3. **Test positioning**: Verify tutorial steps work on different screen sizes
4. **Highlight important elements**: Use `highlightTarget: true` for key UI elements
5. **Provide skip option**: Always include `allowSkip: true` for better UX
6. **Save progress**: Store tutorial completion in backend to avoid showing again
7. **Target specific elements**: Use unique IDs or specific class selectors

## Troubleshooting

### Tutorial step appears in wrong position
- Ensure the `targetSelector` matches an existing element
- Check that the element is visible when tutorial starts
- Try adjusting the `offset` property

### Target element not highlighting
- Verify `highlightTarget: true` is set
- Check that the element has a valid position style

### Tutorial doesn't appear
- Ensure `TutorialProvider` wraps your app
- Check that `TutorialManager` is rendered
- Verify `isActive` is `true`

## Component Files

- `types.ts` - TypeScript interfaces and types
- `TutorialStep.tsx` - Individual tutorial step component
- `TutorialOverlay.tsx` - Main overlay with backdrop
- `TutorialContext.tsx` - React Context provider and hook
- `TutorialManager.tsx` - Global tutorial renderer
- `TutorialExamples.tsx` - Usage examples
- `index.ts` - Public exports

## Integration with Backend

To track tutorial completion in your ArangoDB database:

```tsx
const tutorialConfig = {
  // ... steps
  onComplete: async () => {
    try {
      await fetch(`${API_URL}/users/me/tutorial`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          'finished-tutorial': true,
        }),
      });
    } catch (error) {
      console.error('Failed to update tutorial status:', error);
    }
  },
};
```

## License

Part of the Study Garden project.

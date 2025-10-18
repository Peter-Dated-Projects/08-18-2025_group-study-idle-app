# Tutorial System Integration Guide

This guide shows you how to integrate the tutorial system into your Study Garden application.

## Step 1: Add TutorialProvider to Your Root Layout

Update your `src/app/layout.tsx`:

```tsx
import { TutorialProvider, TutorialManager } from '@/components/tutorial';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-preload-fix">
        <TutorialProvider>
          {children}
          <TutorialManager />
        </TutorialProvider>
      </body>
    </html>
  );
}
```

## Step 2: Create Tutorial Configuration

Create a file for your app's tutorial configuration:

```tsx
// src/config/tutorials.ts
import { TutorialConfig } from '@/components/tutorial';

export const firstTimeTutorial: TutorialConfig = {
  steps: [
    {
      id: 'welcome',
      title: '🌱 Welcome to Study Garden!',
      description: 'Let\'s take a quick tour to help you get started with growing your study garden.',
      targetSelector: '#app-header',
      position: 'bottom',
      highlightTarget: true,
    },
    {
      id: 'garden-view',
      title: 'Your Garden',
      description: 'This is your personal study garden where your plants will grow as you study!',
      targetSelector: '#garden-canvas',
      position: 'top',
      highlightTarget: true,
    },
    {
      id: 'timer',
      title: 'Study Timer',
      description: 'Click here to start a study session. Each session earns you pomos to grow your plants!',
      targetSelector: '#study-timer-button',
      position: 'left',
      highlightTarget: true,
    },
    {
      id: 'inventory',
      title: 'Your Inventory',
      description: 'Check your inventory to see collected items and decorations.',
      targetSelector: '#inventory-button',
      position: 'bottom',
      highlightTarget: true,
    },
    {
      id: 'shop',
      title: 'Shop',
      description: 'Visit the shop to purchase new plants and decorations with your earned pomos!',
      targetSelector: '#shop-button',
      position: 'bottom',
      highlightTarget: true,
    },
    {
      id: 'friends',
      title: 'Friends & Community',
      description: 'Connect with friends and see their gardens. Study together to earn bonuses!',
      targetSelector: '#friends-button',
      position: 'bottom',
      highlightTarget: true,
    },
  ],
  onComplete: async () => {
    // Update backend that user completed tutorial
    try {
      const token = localStorage.getItem('authToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          'finished-tutorial': true,
        }),
      });
      
      console.log('Tutorial completed and saved!');
    } catch (error) {
      console.error('Failed to save tutorial completion:', error);
    }
  },
  onSkip: async () => {
    // Also mark as complete if skipped
    try {
      const token = localStorage.getItem('authToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          'finished-tutorial': true,
        }),
      });
      
      console.log('Tutorial skipped');
    } catch (error) {
      console.error('Failed to save tutorial skip:', error);
    }
  },
  allowSkip: true,
  initialStep: 0,
};
```

## Step 3: Trigger Tutorial on First Login

Update your login page or main app component:

```tsx
// src/app/page.tsx or your main component
'use client';

import { useEffect, useState } from 'react';
import { useTutorial } from '@/components/tutorial';
import { firstTimeTutorial } from '@/config/tutorials';

export default function MainPage() {
  const { startTutorial } = useTutorial();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAndStartTutorial = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        // Fetch user data
        const response = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);

          // Check if user has finished tutorial
          if (!userData['finished-tutorial']) {
            // Wait a bit for UI to load before starting tutorial
            setTimeout(() => {
              startTutorial(firstTimeTutorial);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Failed to check tutorial status:', error);
      }
    };

    checkAndStartTutorial();
  }, [startTutorial]);

  return (
    <div id="app-header">
      {/* Your app content */}
      <div id="garden-canvas">
        {/* Garden view */}
      </div>
      
      <button id="study-timer-button">
        Start Study Session
      </button>
      
      <button id="inventory-button">
        Inventory
      </button>
      
      <button id="shop-button">
        Shop
      </button>
      
      <button id="friends-button">
        Friends
      </button>
    </div>
  );
}
```

## Step 4: Add Backend Endpoint (if needed)

If you need a specific endpoint to update tutorial status, add this to your backend:

```python
# backend/app/routers/user_router.py

@router.patch("/users/me")
async def update_current_user(
    update_data: dict,
    current_user_id: str = Depends(get_current_user_id),
):
    """Update current user's information"""
    try:
        # Update user in ArangoDB
        db = get_db()
        users_collection = db.collection(USERS_COLLECTION)
        
        # Update the user document
        users_collection.update({
            '_key': current_user_id,
            **update_data,
            'updated_at': datetime.utcnow().isoformat()
        })
        
        return {"success": True, "message": "User updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Step 5: Manual Tutorial Trigger

Add a button to allow users to replay the tutorial:

```tsx
// In your settings or help section
import { useTutorial } from '@/components/tutorial';
import { firstTimeTutorial } from '@/config/tutorials';

function SettingsPage() {
  const { startTutorial } = useTutorial();

  return (
    <div>
      <h2>Help & Support</h2>
      <button
        onClick={() => startTutorial(firstTimeTutorial)}
        className="tutorial-replay-button"
      >
        🎓 Replay Tutorial
      </button>
    </div>
  );
}
```

## Step 6: Feature-Specific Tutorials

Create tutorials for specific features:

```tsx
// src/config/tutorials.ts

export const shopTutorial: TutorialConfig = {
  steps: [
    {
      id: 'shop-intro',
      title: '🛍️ Welcome to the Shop!',
      description: 'Here you can buy plants, decorations, and special items.',
      targetSelector: '#shop-container',
      position: 'top',
    },
    {
      id: 'shop-categories',
      title: 'Browse Categories',
      description: 'Click on different categories to see available items.',
      targetSelector: '#shop-categories',
      position: 'right',
      highlightTarget: true,
    },
    {
      id: 'shop-balance',
      title: 'Your Balance',
      description: 'This shows your available pomos to spend.',
      targetSelector: '#pomo-balance',
      position: 'bottom',
      highlightTarget: true,
    },
  ],
  allowSkip: true,
};

// Then trigger it when user first visits shop
export default function ShopPage() {
  const { startTutorial } = useTutorial();
  const [hasSeenShopTutorial, setHasSeenShopTutorial] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('shop-tutorial-seen');
    if (!seen) {
      setTimeout(() => {
        startTutorial(shopTutorial);
        localStorage.setItem('shop-tutorial-seen', 'true');
      }, 500);
    }
  }, [startTutorial]);

  return <div id="shop-container">{/* Shop content */}</div>;
}
```

## Testing the Tutorial System

Create a test page to verify all positions work correctly:

```tsx
// src/app/tutorial-test/page.tsx
'use client';

import { BasicTutorialExample, MultiPositionTutorialExample } from '@/components/tutorial/TutorialExamples';

export default function TutorialTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Tutorial System Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl mb-2">Basic Tutorial</h2>
        <BasicTutorialExample />
      </div>
      
      <div>
        <h2 className="text-xl mb-2">Position Demo</h2>
        <MultiPositionTutorialExample />
      </div>
    </div>
  );
}
```

## Summary

1. ✅ Wrap app with `TutorialProvider`
2. ✅ Add `TutorialManager` to root layout
3. ✅ Create tutorial configurations
4. ✅ Trigger tutorials based on user state
5. ✅ Save completion to backend
6. ✅ Add manual replay options
7. ✅ Test on different screen sizes

Your tutorial system is now fully integrated!

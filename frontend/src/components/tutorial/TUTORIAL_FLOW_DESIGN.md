# Study Garden Tutorial Flow Design

## 🎯 Tutorial Design Philosophy

Based on the existing tutorial system and Study Garden's features, this tutorial follows a **progressive disclosure** approach:
1. Welcome & Core Concept (What is Study Garden?)
2. Essential Actions (How to start studying)
3. Progression System (Growing plants & earning rewards)
4. Social Features (Friends & Community)
5. Advanced Features (Shop, Inventory, Customization)

---

## 📋 Complete Tutorial Flow

### **Phase 1: Welcome & Core Concept** (Steps 1-3)

#### Step 1: Welcome to Study Garden 🌱
- **Target:** `#app-logo` or `#garden-canvas`
- **Position:** `bottom` or `top`
- **Title:** "Welcome to Study Garden! 🌱"
- **Description:** "Transform your study sessions into a thriving garden! Every time you study, your plants grow. Let's take a quick tour to get you started."
- **Highlight:** Yes
- **Purpose:** Set expectations and create excitement

#### Step 2: Your Garden Overview
- **Target:** `#garden-canvas` or `#garden-container`
- **Position:** `top`
- **Title:** "Your Personal Garden 🌿"
- **Description:** "This is your study garden! Right now it's empty, but as you study and earn Pomos (study points), you'll fill it with beautiful plants and decorations."
- **Highlight:** Yes
- **Purpose:** Introduce the main visual metaphor

#### Step 3: Garden Plots
- **Target:** `.garden-plot` or `#plot-0`
- **Position:** `right`
- **Title:** "Garden Plots 🏡"
- **Description:** "Each plot can hold one plant. Click on a plot to see what you can grow there. You start with a few plots unlocked and can unlock more as you progress!"
- **Highlight:** Yes
- **Purpose:** Explain the grid system

---

### **Phase 2: Essential Actions** (Steps 4-6)

#### Step 4: Study Timer ⏱️
- **Target:** `#study-timer-button` or `#timer-icon`
- **Position:** `left`
- **Title:** "Start Studying! ⏱️"
- **Description:** "Click here to start a study session. Choose your duration (15, 25, or 45 minutes), study focused, and earn Pomos! Your plants grow based on your study time."
- **Highlight:** Yes
- **Purpose:** Introduce core mechanic
- **Action Required:** User should understand this is THE primary action

#### Step 5: Earning Pomos 🍅
- **Target:** `#pomo-counter` or `#user-stats`
- **Position:** `bottom`
- **Title:** "Pomos - Your Currency 🍅"
- **Description:** "Pomos are earned by studying. Use them to buy plants, decorations, and unlock new features. The longer you study, the more you earn!"
- **Highlight:** Yes
- **Purpose:** Explain reward system

#### Step 6: Your Profile
- **Target:** `#user-profile-button` or `#avatar-button`
- **Position:** `bottom`
- **Title:** "Your Profile 👤"
- **Description:** "View your stats, level, total study time, and customize your profile picture. Track your growth over time!"
- **Highlight:** Yes
- **Purpose:** Show progress tracking

---

### **Phase 3: Progression System** (Steps 7-9)

#### Step 7: The Shop 🛒
- **Target:** `#shop-button` or `#shop-icon`
- **Position:** `left` or `bottom`
- **Title:** "The Garden Shop 🛒"
- **Description:** "Visit the shop to browse plants, decorations, and special items. Each purchase helps you customize your garden and express your study style!"
- **Highlight:** Yes
- **Purpose:** Introduce progression path

#### Step 8: Your Inventory 🎒
- **Target:** `#inventory-button` or `#inventory-icon`
- **Position:** `left` or `bottom`
- **Title:** "Your Inventory 🎒"
- **Description:** "All the plants and items you own are stored here. Click on items to place them in your garden or manage your collection."
- **Highlight:** Yes
- **Purpose:** Explain item management

#### Step 9: Structures & Buildings 🏗️
- **Target:** `#structures-button` or `.garden-structure`
- **Position:** `right`
- **Title:** "Build Structures 🏗️"
- **Description:** "Place special structures in your garden like workshops, greenhouses, or decorative buildings. These unlock as you level up!"
- **Highlight:** Yes
- **Purpose:** Introduce advanced customization

---

### **Phase 4: Social Features** (Steps 10-12)

#### Step 10: Friends System 👥
- **Target:** `#friends-button` or `#friends-icon`
- **Position:** `left` or `bottom`
- **Title:** "Connect with Friends 👥"
- **Description:** "Add friends to visit their gardens, compare progress, and study together! Friends can motivate each other and earn bonus Pomos."
- **Highlight:** Yes
- **Purpose:** Introduce social layer

#### Step 11: Study Groups 🌐
- **Target:** `#groups-button` or `#groups-icon`
- **Position:** `left` or `bottom`
- **Title:** "Join Study Groups 🌐"
- **Description:** "Create or join study groups with classmates or study buddies. Group study sessions earn bonus rewards and create accountability!"
- **Highlight:** Yes
- **Purpose:** Introduce collaborative features

#### Step 12: Leaderboards 🏆
- **Target:** `#leaderboard-button` or `#leaderboard-icon`
- **Position:** `bottom`
- **Title:** "Compete on Leaderboards 🏆"
- **Description:** "See how you rank against friends and the global community. Friendly competition can boost motivation!"
- **Highlight:** Yes
- **Purpose:** Introduce competitive element

---

### **Phase 5: Final Tips** (Steps 13-14)

#### Step 13: Settings & Help ⚙️
- **Target:** `#settings-button` or `#settings-icon`
- **Position:** `left`
- **Title:** "Settings & Help ⚙️"
- **Description:** "Customize notifications, audio, visual preferences, and access help resources. You can also replay this tutorial anytime!"
- **Highlight:** Yes
- **Purpose:** Show where to get help

#### Step 14: You're Ready! 🎉
- **Target:** `#study-timer-button`
- **Position:** `left`
- **Title:** "You're All Set! 🎉"
- **Description:** "That's it! Start your first study session to begin growing your garden. Remember: consistency is key. Happy studying! 🌱"
- **Highlight:** Yes
- **Purpose:** Encourage first action
- **Special:** This is the LAST step, shows "Finish" button

---

## 🎨 Tutorial Configuration Code

```typescript
// src/config/onboardingTutorial.ts
import { TutorialConfig } from '@/components/tutorial';

export const onboardingTutorial: TutorialConfig = {
  steps: [
    // PHASE 1: Welcome & Core Concept
    {
      id: 'welcome',
      title: 'Welcome to Study Garden! 🌱',
      description: 'Transform your study sessions into a thriving garden! Every time you study, your plants grow. Let\'s take a quick tour to get you started.',
      targetSelector: '#garden-canvas',
      position: 'top',
      highlightTarget: true,
    },
    {
      id: 'garden-overview',
      title: 'Your Personal Garden 🌿',
      description: 'This is your study garden! Right now it\'s empty, but as you study and earn Pomos (study points), you\'ll fill it with beautiful plants and decorations.',
      targetSelector: '#garden-container',
      position: 'top',
      highlightTarget: true,
    },
    {
      id: 'garden-plots',
      title: 'Garden Plots 🏡',
      description: 'Each plot can hold one plant. Click on a plot to see what you can grow there. You start with a few plots unlocked and can unlock more as you progress!',
      targetSelector: '.garden-plot',
      position: 'right',
      highlightTarget: true,
      offset: { x: 0, y: 0 },
    },

    // PHASE 2: Essential Actions
    {
      id: 'study-timer',
      title: 'Start Studying! ⏱️',
      description: 'Click here to start a study session. Choose your duration (15, 25, or 45 minutes), study focused, and earn Pomos! Your plants grow based on your study time.',
      targetSelector: '#study-timer-button',
      position: 'left',
      highlightTarget: true,
    },
    {
      id: 'pomos',
      title: 'Pomos - Your Currency 🍅',
      description: 'Pomos are earned by studying. Use them to buy plants, decorations, and unlock new features. The longer you study, the more you earn!',
      targetSelector: '#pomo-counter',
      position: 'bottom',
      highlightTarget: true,
    },
    {
      id: 'user-profile',
      title: 'Your Profile 👤',
      description: 'View your stats, level, total study time, and customize your profile picture. Track your growth over time!',
      targetSelector: '#user-profile-button',
      position: 'bottom',
      highlightTarget: true,
    },

    // PHASE 3: Progression System
    {
      id: 'shop',
      title: 'The Garden Shop 🛒',
      description: 'Visit the shop to browse plants, decorations, and special items. Each purchase helps you customize your garden and express your study style!',
      targetSelector: '#shop-button',
      position: 'left',
      highlightTarget: true,
    },
    {
      id: 'inventory',
      title: 'Your Inventory 🎒',
      description: 'All the plants and items you own are stored here. Click on items to place them in your garden or manage your collection.',
      targetSelector: '#inventory-button',
      position: 'left',
      highlightTarget: true,
    },
    {
      id: 'structures',
      title: 'Build Structures 🏗️',
      description: 'Place special structures in your garden like workshops, greenhouses, or decorative buildings. These unlock as you level up!',
      targetSelector: '#structures-button',
      position: 'right',
      highlightTarget: true,
    },

    // PHASE 4: Social Features
    {
      id: 'friends',
      title: 'Connect with Friends 👥',
      description: 'Add friends to visit their gardens, compare progress, and study together! Friends can motivate each other and earn bonus Pomos.',
      targetSelector: '#friends-button',
      position: 'left',
      highlightTarget: true,
    },
    {
      id: 'groups',
      title: 'Join Study Groups 🌐',
      description: 'Create or join study groups with classmates or study buddies. Group study sessions earn bonus rewards and create accountability!',
      targetSelector: '#groups-button',
      position: 'left',
      highlightTarget: true,
    },
    {
      id: 'leaderboards',
      title: 'Compete on Leaderboards 🏆',
      description: 'See how you rank against friends and the global community. Friendly competition can boost motivation!',
      targetSelector: '#leaderboard-button',
      position: 'bottom',
      highlightTarget: true,
    },

    // PHASE 5: Final Tips
    {
      id: 'settings',
      title: 'Settings & Help ⚙️',
      description: 'Customize notifications, audio, visual preferences, and access help resources. You can also replay this tutorial anytime!',
      targetSelector: '#settings-button',
      position: 'left',
      highlightTarget: true,
    },
    {
      id: 'ready',
      title: 'You\'re All Set! 🎉',
      description: 'That\'s it! Start your first study session to begin growing your garden. Remember: consistency is key. Happy studying! 🌱',
      targetSelector: '#study-timer-button',
      position: 'left',
      highlightTarget: true,
    },
  ],

  onComplete: async () => {
    // Save to backend
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

      // Optional: Show completion message
      console.log('🎉 Tutorial completed! Welcome to Study Garden!');
      
      // Optional: Track analytics
      // analytics.track('tutorial_completed');
      
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

---

## 🔄 Alternative Tutorial Flows

### **Quick Start Tutorial** (5 steps - for impatient users)
Condensed version focusing only on essentials:
1. Welcome + Garden Overview
2. Study Timer (core action)
3. Pomos & Progression
4. Shop & Inventory (combined)
5. You're ready!

### **Interactive Tutorial** (with required actions)
User must complete actions before proceeding:
1. Welcome → Click anywhere to continue
2. Garden Plot → Click on a plot
3. Study Timer → Click to open timer (don't start)
4. Shop → Browse one category
5. Complete!

### **Contextual Help** (on-demand)
Instead of full tutorial, show tooltips on first interaction:
- First garden visit → Show garden tooltip
- First timer click → Explain timer
- First shop visit → Shop tutorial
- etc.

---

## 🎯 Tutorial Trigger Strategy

### **When to Show Tutorial**

```typescript
// In your main app component or garden page
useEffect(() => {
  const checkTutorialStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const user = await response.json();
        
        // Check if user has completed tutorial
        const hasCompletedTutorial = user['finished-tutorial'];
        const hasSeenTutorial = localStorage.getItem('tutorial-seen');

        // Show tutorial if:
        // 1. User hasn't completed it in backend
        // 2. User hasn't seen it locally (fallback)
        // 3. User has been logged in for < 1 minute (wait for UI to load)
        
        if (!hasCompletedTutorial && !hasSeenTutorial) {
          // Wait 2 seconds for UI to fully render
          setTimeout(() => {
            startTutorial(onboardingTutorial);
            localStorage.setItem('tutorial-seen', 'true');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Failed to check tutorial status:', error);
    }
  };

  checkTutorialStatus();
}, [startTutorial]);
```

### **Alternative Triggers**

1. **On First Garden Visit**
   - Trigger when user first accesses `/garden` route
   - Best for apps with multiple entry points

2. **After Account Creation**
   - Trigger immediately after successful signup
   - Good for capturing engagement early

3. **Manual Trigger**
   - Always available in Help/Settings
   - "Replay Tutorial" button

4. **Smart Trigger**
   - Check if user has performed core actions
   - Only show if user seems confused (no study sessions after 5 minutes)

---

## 📊 Tutorial Analytics (Recommended)

Track tutorial effectiveness:

```typescript
// Add to tutorial config
onComplete: async () => {
  // ... existing save logic
  
  // Track completion
  analytics.track('tutorial_completed', {
    duration: calculateTutorialDuration(),
    steps_completed: 14,
    skipped: false,
  });
},

onSkip: async () => {
  // ... existing save logic
  
  // Track skip
  analytics.track('tutorial_skipped', {
    steps_completed: currentStepIndex,
    skip_step: currentStep.id,
  });
},

// Track each step
onStepChange: (step, index) => {
  analytics.track('tutorial_step_viewed', {
    step_id: step.id,
    step_index: index,
    step_title: step.title,
  });
},
```

---

## 🎨 UI/UX Considerations

### **Required Component IDs**

Ensure these IDs exist in your components:

```tsx
// Garden Page
<div id="garden-canvas">...</div>
<div id="garden-container">...</div>
<div className="garden-plot">...</div>

// Navigation Icons
<button id="study-timer-button">...</button>
<button id="shop-button">...</button>
<button id="inventory-button">...</button>
<button id="friends-button">...</button>
<button id="groups-button">...</button>
<button id="leaderboard-button">...</button>
<button id="structures-button">...</button>
<button id="user-profile-button">...</button>
<button id="settings-button">...</button>

// Stats
<div id="pomo-counter">...</div>
```

### **Visual Consistency**
- All tutorial steps use warm, welcoming emoji 🌱🌿🏡
- Descriptions are concise (2-3 sentences max)
- Titles are action-oriented
- Highlights create visual focus

### **Accessibility**
- Tutorial can be skipped at any time
- Step counter shows progress
- Clear navigation with back/next
- Works on mobile (responsive)

---

## 🚀 Implementation Checklist

- [ ] Add IDs to all target elements in garden components
- [ ] Create `onboardingTutorial.ts` config file
- [ ] Add tutorial trigger logic to garden page
- [ ] Test tutorial on desktop (1920x1080)
- [ ] Test tutorial on tablet (768x1024)
- [ ] Test tutorial on mobile (375x812)
- [ ] Add "Replay Tutorial" button to settings
- [ ] Test backend integration (save completion)
- [ ] Verify all 14 steps position correctly
- [ ] Test skip functionality
- [ ] Test back/next navigation
- [ ] Add analytics tracking (optional)
- [ ] Get user feedback and iterate

---

## 💡 Pro Tips

1. **Keep it Short**: 14 steps is the maximum. Consider condensing to 10 for faster onboarding.

2. **Front-load Value**: Steps 1-6 cover the essentials. If users skip after step 6, they still know how to use the app.

3. **Make it Skippable**: Always allow skip. Some users prefer exploration.

4. **Delay the Start**: Wait 2-3 seconds after page load to ensure all elements are rendered.

5. **Use Real Data**: If possible, show user's actual garden state, not a demo.

6. **Celebrate Completion**: Show a success message or reward when tutorial completes.

7. **Make it Replayable**: Users forget. Allow them to replay from settings.

8. **Test with Real Users**: Get feedback from actual new users, not just developers.

---

This tutorial design creates a comprehensive onboarding experience that:
- ✅ Introduces core concepts gradually
- ✅ Highlights key features in logical order
- ✅ Encourages immediate action (start studying)
- ✅ Provides clear progression path
- ✅ Integrates with backend (`finished-tutorial` field)
- ✅ Is fully compatible with the tutorial system we built

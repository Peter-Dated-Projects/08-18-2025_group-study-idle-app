/**
 * Study Garden Onboarding Tutorial Configuration
 * 
 * This tutorial guides new users through all major features of Study Garden.
 * It follows a progressive disclosure approach, introducing features in order of importance.
 */

import { TutorialConfig } from '@/components/tutorial';

/**
 * Main onboarding tutorial for new users
 * 14 steps covering all essential features
 */
export const onboardingTutorial: TutorialConfig = {
  steps: [
    // ========================================
    // PHASE 1: Welcome & Core Concept (Steps 1-3)
    // ========================================
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
    },

    // ========================================
    // PHASE 2: Essential Actions (Steps 4-6)
    // ========================================
    {
      id: 'study-timer',
      title: 'Start Studying! ⏱️',
      description: 'Click here to start a study session. Choose your duration (15, 25, or 45 minutes), study focused, and earn Pomos! Your plants grow based on your study time.',
      targetSelector: '#pomodoro-timer-section',
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

    // ========================================
    // PHASE 3: Progression System (Steps 7-9)
    // ========================================
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

    // ========================================
    // PHASE 4: Social Features (Steps 10-12)
    // ========================================
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

    // ========================================
    // PHASE 5: Final Tips (Steps 13-14)
    // ========================================
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
      targetSelector: '#pomodoro-timer-section',
      position: 'left',
      highlightTarget: true,
    },
  ],

  onComplete: async () => {
    try {
      // Save tutorial completion to backend via /api/users/me
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'finished-tutorial': true,
          }
        }),
      });

      if (response.ok) {
        console.log('🎉 Tutorial completed! Welcome to Study Garden!');
      } else {
        console.error('Failed to save tutorial completion to backend');
      }
      
      // Also mark as seen locally as a backup
      localStorage.setItem('tutorial-completed', 'true');
      
    } catch (error) {
      console.error('Failed to save tutorial completion:', error);
      // Still mark as seen locally
      localStorage.setItem('tutorial-completed', 'true');
    }
  },

  onSkip: async () => {
    try {
      // Also mark as complete if skipped (user chose not to see it again)
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'finished-tutorial': true,
          }
        }),
      });

      if (response.ok) {
        console.log('Tutorial skipped and marked as complete');
      } else {
        console.error('Failed to save tutorial skip to backend');
      }
      
      localStorage.setItem('tutorial-completed', 'true');
      
    } catch (error) {
      console.error('Failed to save tutorial skip:', error);
      localStorage.setItem('tutorial-completed', 'true');
    }
  },

  allowSkip: true,
  initialStep: 0,
};

/**
 * Quick Start Tutorial (condensed version)
 * 5 steps covering only the essentials
 * Good for users who want to get started quickly
 */
export const quickStartTutorial: TutorialConfig = {
  steps: [
    {
      id: 'quick-welcome',
      title: 'Welcome! 🌱',
      description: 'Study Garden helps you stay motivated by growing a virtual garden as you study. Here are the basics!',
      targetSelector: '#garden-canvas',
      position: 'top',
      highlightTarget: true,
    },
    {
      id: 'quick-timer',
      title: 'Start Studying ⏱️',
      description: 'Click here to start a study session and earn Pomos (study points).',
      targetSelector: '#pomodoro-timer-section',
      position: 'left',
      highlightTarget: true,
    },
    {
      id: 'quick-shop',
      title: 'Shop & Grow 🛒',
      description: 'Use your Pomos to buy plants and decorations from the shop.',
      targetSelector: '#shop-button',
      position: 'left',
      highlightTarget: true,
    },
    {
      id: 'quick-inventory',
      title: 'Place Items 🎒',
      description: 'Access your inventory to place plants in your garden.',
      targetSelector: '#inventory-button',
      position: 'left',
      highlightTarget: true,
    },
    {
      id: 'quick-ready',
      title: 'Ready to Grow! 🌿',
      description: 'That\'s it! Start studying to grow your garden. You can explore other features later.',
      targetSelector: '#pomodoro-timer-section',
      position: 'left',
      highlightTarget: true,
    },
  ],

  onComplete: async () => {
    // Same as main tutorial
    onboardingTutorial.onComplete?.();
  },

  onSkip: async () => {
    // Same as main tutorial
    onboardingTutorial.onSkip?.();
  },

  allowSkip: true,
  initialStep: 0,
};

/**
 * Feature-specific tutorials
 * These can be triggered when users first access specific features
 */

export const shopTutorial: TutorialConfig = {
  steps: [
    {
      id: 'shop-welcome',
      title: 'Welcome to the Shop! 🛍️',
      description: 'Here you can buy plants, decorations, and special items with your earned Pomos.',
      targetSelector: '#shop-container',
      position: 'top',
      highlightTarget: false,
    },
    {
      id: 'shop-categories',
      title: 'Browse Categories 📑',
      description: 'Click on different categories to see available items. Each category has unique plants and decorations!',
      targetSelector: '#shop-categories',
      position: 'right',
      highlightTarget: true,
    },
    {
      id: 'shop-balance',
      title: 'Your Balance 💰',
      description: 'This shows your available Pomos. Study more to earn more and expand your collection!',
      targetSelector: '#pomo-balance',
      position: 'bottom',
      highlightTarget: true,
    },
  ],
  allowSkip: true,
};

export const friendsTutorial: TutorialConfig = {
  steps: [
    {
      id: 'friends-welcome',
      title: 'Friends System 👥',
      description: 'Connect with friends to visit their gardens and study together!',
      targetSelector: '#friends-modal',
      position: 'top',
      highlightTarget: false,
    },
    {
      id: 'friends-add',
      title: 'Add Friends ➕',
      description: 'Search for friends by username or email to send friend requests.',
      targetSelector: '#add-friend-button',
      position: 'bottom',
      highlightTarget: true,
    },
    {
      id: 'friends-visit',
      title: 'Visit Gardens 🏡',
      description: 'Click on a friend to visit their garden and see their progress!',
      targetSelector: '#friends-list',
      position: 'right',
      highlightTarget: true,
    },
  ],
  allowSkip: true,
};

/**
 * Phase 1 Test Tutorial
 * Only includes the first 3 steps for testing the tutorial system
 * Perfect for development and initial rollout testing
 */
export const phase1TestTutorial: TutorialConfig = {
  steps: [
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
      id: 'garden-canvas-intro',
      title: 'Your Growing Space 🏡',
      description: 'This canvas is where all your plants and decorations will live. As you study more, you\'ll unlock plots where you can grow different plants. Each study session helps your garden flourish!',
      targetSelector: '#garden-canvas',
      position: 'right',
      highlightTarget: true,
    },
  ],

  onComplete: async () => {
    console.log('✅ Phase 1 tutorial completed!');
    // For testing, we'll just log. In production, this would save to backend.
    localStorage.setItem('phase1-tutorial-completed', 'true');
  },

  onSkip: async () => {
    console.log('⏭️ Phase 1 tutorial skipped');
    localStorage.setItem('phase1-tutorial-completed', 'true');
  },

  allowSkip: true,
  initialStep: 0,
};

/**
 * Phase 2 & 3 Test Tutorial
 * Includes steps 1-7: Welcome + Core Concept + Essential Actions + Shop
 * Tests the tutorial system with all available UI elements
 * Skips inventory and structures steps (no dedicated buttons yet)
 */
export const phase2And3TestTutorial: TutorialConfig = {
  steps: [
    // PHASE 1: Welcome & Core Concept (Steps 1-3)
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
      id: 'garden-canvas-intro',
      title: 'Your Growing Space 🏡',
      description: 'This canvas is where all your plants and decorations will live. As you study more, you\'ll unlock plots where you can grow different plants. Each study session helps your garden flourish!',
      targetSelector: '#garden-canvas',
      position: 'right',
      highlightTarget: true,
    },

    // PHASE 2: Essential Actions (Steps 4-6)
    {
      id: 'study-timer',
      title: 'Start Studying! ⏱️',
      description: 'Click here to start a study session. Choose your duration (15, 25, or 45 minutes), study focused, and earn Pomos! Your plants grow based on your study time.',
      targetSelector: '#pomodoro-timer-section',
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

    // PHASE 3: Progression System (Step 7 only - shop)
    {
      id: 'shop',
      title: 'The Garden Shop 🛒',
      description: 'Visit the shop to browse plants, decorations, and special items. Each purchase helps you customize your garden and express your study style! After buying items, you can place them in your garden by clicking on a plot.',
      targetSelector: '#shop-button',
      position: 'right',
      highlightTarget: true,
    },
  ],

  onComplete: async () => {
    try {
      // Save tutorial completion to backend via /api/users/me
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'finished-tutorial': true,
          }
        }),
      });

      if (response.ok) {
        console.log('✅ Phase 2 & 3 tutorial completed!');
      } else {
        console.error('Failed to save tutorial completion to backend');
      }
      
      // Also mark as seen locally as a backup
      localStorage.setItem('phase2and3-tutorial-completed', 'true');
      
    } catch (error) {
      console.error('Failed to save tutorial completion:', error);
      // Still mark as seen locally
      localStorage.setItem('phase2and3-tutorial-completed', 'true');
    }
  },

  onSkip: async () => {
    try {
      // Also mark as complete if skipped (user chose not to see it again)
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'finished-tutorial': true,
          }
        }),
      });

      if (response.ok) {
        console.log('⏭️ Phase 2 & 3 tutorial skipped');
      } else {
        console.error('Failed to save tutorial skip to backend');
      }
      
      localStorage.setItem('phase2and3-tutorial-completed', 'true');
      
    } catch (error) {
      console.error('Failed to save tutorial skip:', error);
      localStorage.setItem('phase2and3-tutorial-completed', 'true');
    }
  },

  allowSkip: true,
  initialStep: 0,
};

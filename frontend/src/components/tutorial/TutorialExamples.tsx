/**
 * Example Tutorial Implementation
 * This file demonstrates how to use the tutorial system in your application
 */

import React, { useState } from 'react';
import { TutorialOverlay, useTutorial } from './index';
import type { TutorialConfig } from './types';

/**
 * Example 1: Basic Tutorial Usage with TutorialOverlay
 */
export function BasicTutorialExample() {
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  const tutorialConfig: TutorialConfig = {
    steps: [
      {
        id: 'step-1',
        title: 'Welcome!',
        description: 'This is the first step of the tutorial. Click Next to continue.',
        targetSelector: '#welcome-button',
        position: 'bottom',
        highlightTarget: true,
      },
      {
        id: 'step-2',
        title: 'Navigation Menu',
        description: 'Use this menu to navigate through different sections of the app.',
        targetSelector: '#nav-menu',
        position: 'right',
        highlightTarget: true,
      },
      {
        id: 'step-3',
        title: 'Settings',
        description: 'Click here to access your account settings and preferences.',
        targetSelector: '#settings-button',
        position: 'left',
        offset: { x: 0, y: -20 },
        highlightTarget: true,
      },
    ],
    onComplete: () => {
      console.log('Tutorial completed!');
      setIsTutorialActive(false);
    },
    onSkip: () => {
      console.log('Tutorial skipped');
      setIsTutorialActive(false);
    },
    allowSkip: true,
  };

  return (
    <div>
      <button
        id="welcome-button"
        onClick={() => setIsTutorialActive(true)}
        style={{ padding: '10px 20px', margin: '10px' }}
      >
        Start Tutorial
      </button>

      <div id="nav-menu" style={{ padding: '10px', margin: '10px', border: '1px solid #ccc' }}>
        Navigation Menu
      </div>

      <button
        id="settings-button"
        style={{ padding: '10px 20px', margin: '10px' }}
      >
        Settings
      </button>

      <TutorialOverlay
        config={tutorialConfig}
        isActive={isTutorialActive}
        onClose={() => setIsTutorialActive(false)}
      />
    </div>
  );
}

/**
 * Example 2: Using Tutorial Context (Recommended for larger apps)
 */
export function ContextTutorialExample() {
  const { startTutorial } = useTutorial();

  const handleStartTutorial = () => {
    const config: TutorialConfig = {
      steps: [
        {
          id: 'context-step-1',
          title: 'Using Context',
          description: 'This tutorial is managed through the TutorialContext provider.',
          targetSelector: '#context-button',
          position: 'bottom',
          highlightTarget: true,
        },
        {
          id: 'context-step-2',
          title: 'Global State',
          description: 'The tutorial state is available throughout your app!',
          targetSelector: '#feature-box',
          position: 'top',
          highlightTarget: true,
        },
      ],
      onComplete: () => {
        console.log('Context tutorial completed!');
        // You can also save to backend that user completed the tutorial
        // e.g., updateUserTutorialStatus('finished-tutorial', true);
      },
      allowSkip: true,
    };

    startTutorial(config);
  };

  return (
    <div>
      <button
        id="context-button"
        onClick={handleStartTutorial}
        style={{ padding: '10px 20px', margin: '10px' }}
      >
        Start Context Tutorial
      </button>

      <div
        id="feature-box"
        style={{ padding: '20px', margin: '10px', border: '2px solid #4285F4' }}
      >
        Feature Box
      </div>
    </div>
  );
}

/**
 * Example 3: Multi-position Tutorial
 */
export function MultiPositionTutorialExample() {
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  const tutorialConfig: TutorialConfig = {
    steps: [
      {
        id: 'pos-1',
        title: 'Top Position',
        description: 'This tutorial step appears above the target element.',
        targetSelector: '#target-top',
        position: 'top',
        highlightTarget: true,
      },
      {
        id: 'pos-2',
        title: 'Right Position',
        description: 'This tutorial step appears to the right of the target element.',
        targetSelector: '#target-right',
        position: 'right',
        highlightTarget: true,
      },
      {
        id: 'pos-3',
        title: 'Bottom Position',
        description: 'This tutorial step appears below the target element.',
        targetSelector: '#target-bottom',
        position: 'bottom',
        highlightTarget: true,
      },
      {
        id: 'pos-4',
        title: 'Left Position',
        description: 'This tutorial step appears to the left of the target element.',
        targetSelector: '#target-left',
        position: 'left',
        highlightTarget: true,
      },
    ],
    onComplete: () => setIsTutorialActive(false),
    allowSkip: true,
  };

  return (
    <div style={{ padding: '50px' }}>
      <button onClick={() => setIsTutorialActive(true)}>
        Start Position Demo
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '100px', marginTop: '100px' }}>
        <div id="target-top" style={{ padding: '20px', border: '2px solid #000' }}>
          Top Target
        </div>
        <div id="target-right" style={{ padding: '20px', border: '2px solid #000' }}>
          Right Target
        </div>
        <div id="target-bottom" style={{ padding: '20px', border: '2px solid #000' }}>
          Bottom Target
        </div>
        <div id="target-left" style={{ padding: '20px', border: '2px solid #000' }}>
          Left Target
        </div>
      </div>

      <TutorialOverlay
        config={tutorialConfig}
        isActive={isTutorialActive}
        onClose={() => setIsTutorialActive(false)}
      />
    </div>
  );
}

# Study Garden Tutorial Flow - Visual Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                     NEW USER ARRIVES                                │
│                    (First time in garden)                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Check Backend  │
                    │ finished-      │
                    │ tutorial: ?    │
                    └────┬───────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
         false                      true
            │                         │
            ▼                         ▼
    ┌───────────────┐         ┌──────────────┐
    │ START TUTORIAL│         │ NO TUTORIAL  │
    │   (2s delay)  │         │ Show normal  │
    └───────┬───────┘         │   garden     │
            │                 └──────────────┘
            ▼
┌───────────────────────────────────────────────────────────────────┐
│                        TUTORIAL FLOW                              │
└───────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════╗
║                    PHASE 1: WELCOME (Steps 1-3)                   ║
╚═══════════════════════════════════════════════════════════════════╝

    Step 1                    Step 2                   Step 3
┌──────────────┐         ┌──────────────┐        ┌──────────────┐
│  Welcome! 🌱 │         │   Garden 🌿  │        │  Plots 🏡    │
│              │  ────►  │              │  ────► │              │
│ "Transform   │         │ "This is     │        │ "Each plot   │
│  study into  │         │  your        │        │  holds one   │
│  garden"     │         │  garden"     │        │  plant"      │
└──────────────┘         └──────────────┘        └──────────────┘
Target: #garden-canvas   #garden-container       .garden-plot
Position: top            top                     right

╔═══════════════════════════════════════════════════════════════════╗
║              PHASE 2: ESSENTIAL ACTIONS (Steps 4-6)               ║
╚═══════════════════════════════════════════════════════════════════╝

    Step 4                    Step 5                   Step 6
┌──────────────┐         ┌──────────────┐        ┌──────────────┐
│  Timer ⏱️    │         │  Pomos 🍅    │        │ Profile 👤   │
│              │  ────►  │              │  ────► │              │
│ "Start a     │         │ "Your        │        │ "View your   │
│  study       │         │  currency    │        │  stats &     │
│  session"    │         │  for buying" │        │  progress"   │
└──────────────┘         └──────────────┘        └──────────────┘
#study-timer-button      #pomo-counter           #user-profile-button
left                     bottom                  bottom

        ★ CORE MECHANIC ★
     This is the most important step!

╔═══════════════════════════════════════════════════════════════════╗
║            PHASE 3: PROGRESSION SYSTEM (Steps 7-9)                ║
╚═══════════════════════════════════════════════════════════════════╝

    Step 7                    Step 8                   Step 9
┌──────────────┐         ┌──────────────┐        ┌──────────────┐
│  Shop 🛒     │         │ Inventory 🎒 │        │Structures 🏗️│
│              │  ────►  │              │  ────► │              │
│ "Buy plants  │         │ "Manage your │        │ "Build       │
│  and items"  │         │  collection" │        │  workshops"  │
└──────────────┘         └──────────────┘        └──────────────┘
#shop-button             #inventory-button       #structures-button
left                     left                    right

╔═══════════════════════════════════════════════════════════════════╗
║              PHASE 4: SOCIAL FEATURES (Steps 10-12)               ║
╚═══════════════════════════════════════════════════════════════════╝

    Step 10                   Step 11                  Step 12
┌──────────────┐         ┌──────────────┐        ┌──────────────┐
│ Friends 👥   │         │  Groups 🌐   │        │Leaderboard🏆│
│              │  ────►  │              │  ────► │              │
│ "Connect &   │         │ "Study       │        │ "Compete     │
│  visit       │         │  together    │        │  globally"   │
│  gardens"    │         │  for bonus"  │        │              │
└──────────────┘         └──────────────┘        └──────────────┘
#friends-button          #groups-button          #leaderboard-button
left                     left                    bottom

╔═══════════════════════════════════════════════════════════════════╗
║                PHASE 5: FINAL TIPS (Steps 13-14)                  ║
╚═══════════════════════════════════════════════════════════════════╝

    Step 13                   Step 14
┌──────────────┐         ┌──────────────┐
│ Settings ⚙️  │         │  Ready! 🎉   │
│              │  ────►  │              │
│ "Customize & │         │ "Start your  │
│  get help"   │         │  first       │
│              │         │  session!"   │
└──────────────┘         └──────────────┘
#settings-button         #study-timer-button
left                     left
                              │
                              ▼
                    ┌────────────────┐
                    │ FINISH BUTTON  │
                    │  (last step)   │
                    └────────┬───────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
         Finish                            Skip
            │                                 │
            ▼                                 ▼
    ┌───────────────┐                ┌──────────────┐
    │ onComplete()  │                │  onSkip()    │
    │ Save to DB    │                │  Save to DB  │
    │ finished-     │                │  finished-   │
    │ tutorial:true │                │  tutorial:   │
    └───────┬───────┘                │  true        │
            │                        └──────┬───────┘
            │                               │
            └───────────┬───────────────────┘
                        │
                        ▼
            ┌───────────────────┐
            │  TUTORIAL ENDS    │
            │  User continues   │
            │  to garden        │
            └───────────────────┘
```

---

## Tutorial Navigation Map

```
┌─────────────────────────────────────────────────────┐
│              Tutorial Controls                      │
└─────────────────────────────────────────────────────┘

At Each Step:
┌───────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐         │
│  │  Step Title                        [3 / 14] │  ◄─ Counter
│  ├─────────────────────────────────────────────┤         │
│  │                                             │         │
│  │  Step Description goes here...              │         │
│  │                                             │         │
│  ├─────────────────────────────────────────────┤         │
│  │  [← Back]                      [Next →]     │         │
│  │    (or)                          (or)       │         │
│  │ (disabled)                   [Finish ✓]     │         │
│  └─────────────────────────────────────────────┘         │
│                                                           │
│  [Skip Tutorial ✕]  ◄─ Always available (top-right)     │
└───────────────────────────────────────────────────────────┘

Navigation Rules:
• Step 1: Back button disabled
• Steps 2-13: Both Back and Next available
• Step 14: Back available, "Finish" instead of "Next"
• Any step: Skip button in top-right
```

---

## User Journey Decision Tree

```
                    ┌─────────────┐
                    │ User Enters │
                    │   Garden    │
                    └──────┬──────┘
                           │
                  ┌────────┴────────┐
                  │ Has user seen   │
                  │   tutorial?     │
                  └────┬────────┬───┘
                       │        │
                     Yes       No
                       │        │
                       │        └──► START TUTORIAL
                       │                    │
                       │            ┌───────┴────────┐
                       │            │                │
                       │         Step 1           Skip?
                       │            │                │
                       │            ▼               Yes
                       │         Step 2              │
                       │            │                │
                       │            ▼               No
                       │         Step 3              │
                       │            │                │
                       │            ▼                │
                       │           ...               │
                       │            │                │
                       │            ▼                │
                       │         Step 14             │
                       │            │                │
                       │            ▼                │
                       │        Finish               │
                       │            │                │
                       └────────────┴────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ Save to Backend: │
                          │ finished-        │
                          │ tutorial = true  │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────┐
                          │ Continue to  │
                          │    Garden    │
                          └──────────────┘
```

---

## Information Architecture

```
Tutorial Content Hierarchy:

Level 1: Phases (5 total)
    │
    ├─ Phase 1: Welcome & Core Concept
    │     ├─ Step 1: Welcome
    │     ├─ Step 2: Garden Overview  
    │     └─ Step 3: Garden Plots
    │
    ├─ Phase 2: Essential Actions ★ MOST IMPORTANT
    │     ├─ Step 4: Study Timer (CORE MECHANIC)
    │     ├─ Step 5: Pomos
    │     └─ Step 6: User Profile
    │
    ├─ Phase 3: Progression System
    │     ├─ Step 7: Shop
    │     ├─ Step 8: Inventory
    │     └─ Step 9: Structures
    │
    ├─ Phase 4: Social Features
    │     ├─ Step 10: Friends
    │     ├─ Step 11: Groups
    │     └─ Step 12: Leaderboards
    │
    └─ Phase 5: Final Tips
          ├─ Step 13: Settings
          └─ Step 14: Ready!

Exit Points:
    • After Step 6: User knows core loop
    • After Step 9: User knows progression
    • After Step 12: User knows social
    • After Step 14: Complete understanding
    • Any Step: Skip button (exits immediately)
```

---

## Tutorial Positioning Strategy

```
Screen Layout:
┌─────────────────────────────────────────────────────┐
│  [Skip Tutorial ✕]                                  │
│                                                      │
│   [👤]  [Pomos: 0]                                  │
│                                                      │
│        ┌─────────────────────┐                      │
│        │                     │  [⚙️]                │
│        │   GARDEN CANVAS     │  [🛒] ◄─ Tutorial    │
│        │                     │  [🎒]    appears     │
│        │   (PixiJS view)     │  [👥]    left        │
│        │                     │  [🌐]                │
│        └─────────────────────┘  [🏆]                │
│              │                                       │
│              └─ Tutorial appears top/bottom         │
│                                                      │
│   [⏱️ Start Study] ◄─ Tutorial appears left         │
│                                                      │
└─────────────────────────────────────────────────────┘

Positioning Logic:
• UI Icons (right side) → Tutorial: left/bottom
• Garden Canvas → Tutorial: top/bottom
• Timer Button (bottom) → Tutorial: left
• Auto-adjust for mobile screens
```

---

## Success Path vs Skip Path

```
┌─────────────────────────────────────────────────────┐
│              SUCCESS PATH (Ideal)                    │
└─────────────────────────────────────────────────────┘

User → Sees Tutorial → Completes All 14 Steps 
    → Understands Core Loop → Starts First Study Session
    → Earns Pomos → Buys First Plant → Garden Grows
    → Returns Tomorrow → Long-term Retention ✅


┌─────────────────────────────────────────────────────┐
│            SKIP PATH (Still Acceptable)              │
└─────────────────────────────────────────────────────┘

User → Sees Tutorial → Skips After Step 6
    → Knows Basic Loop → Explores on Own
    → May Return to Tutorial via Settings
    → Medium Retention ⚠️


┌─────────────────────────────────────────────────────┐
│          IMMEDIATE SKIP (Less Ideal)                 │
└─────────────────────────────────────────────────────┘

User → Sees Tutorial → Skips Immediately
    → Confused About Features → Random Clicking
    → May or May Not Figure It Out
    → Lower Retention ❌
    → Mitigation: Contextual tooltips, help button
```

---

This visual map provides:
✅ Complete tutorial flow visualization
✅ Navigation patterns
✅ Decision trees
✅ Information hierarchy
✅ Success metrics
✅ User journey mapping

Use this as a reference for implementation and testing!

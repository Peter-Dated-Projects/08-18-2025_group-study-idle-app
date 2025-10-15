/**
 * Example usage of the Global Signal System
 * This file demonstrates how any component can emit signals to control avatar behavior
 */

import { emitSignal, onSignal } from "@/engine/scripts/GlobalSignalHandler";

// ==========================================
// SIGNAL DEFINITIONS (for documentation)
// ==========================================

/**
 * Avatar Control Signals:
 *
 * 'avatar.cheer' - Makes avatar transition to cheer state
 * 'avatar.love' - Makes avatar transition to heart/love state
 * 'avatar.transition' - Direct state transition { to: string }
 * 'player.gotItem' - Player received an item { item: Item, value: number }
 * 'player.tookDamage' - Player took damage { damage: number }
 * 'game.levelUp' - Player leveled up { newLevel: number }
 * 'ui.clickedButton' - UI button was clicked { buttonId: string }
 */

// ==========================================
// HELPER FUNCTIONS FOR EASY SIGNAL EMISSION
// ==========================================

/**
 * Make the avatar show cheer animation
 */
export function cheerAvatar() {
  emitSignal("avatar.cheer");
}

/**
 * Make the avatar show love/heart animation
 */
export function loveAvatar() {
  emitSignal("avatar.love");
}

/**
 * Trigger avatar character clicked (same as clicking the avatar)
 */
export function clickAvatar() {
  emitSignal("avatarCharacterClicked");
}

/**
 * Direct avatar state transition
 */
export function setAvatarState(stateId: string) {
  emitSignal("avatar.transition", { to: stateId });
}

/**
 * Simulate player getting an item (triggers happy avatar)
 */
export function playerGotItem(itemName: string, value: number) {
  emitSignal("player.gotItem", { item: itemName, value });
}

/**
 * Simulate player taking damage (triggers sad/hurt avatar)
 */
export function playerTookDamage(damage: number) {
  emitSignal("player.tookDamage", { damage });
}

/**
 * Simulate player leveling up (triggers celebration)
 */
export function playerLeveledUp(newLevel: number) {
  emitSignal("game.levelUp", { newLevel });
}

// ==========================================
// EXAMPLE REACT COMPONENT INTEGRATION
// ==========================================

/**
 * Example React component that uses signals
 */
export function ExampleGameUI() {
  // Subscribe to signals in useEffect
  // useEffect(() => {
  //   const unsubscribe1 = onSignal('player.gotItem', (data) => {

  //     // Show UI notification, play sound, etc.
  //   });

  //   const unsubscribe2 = onSignal('player.tookDamage', (data) => {

  //     // Flash screen red, shake camera, etc.
  //   });

  //   return () => {
  //     unsubscribe1();
  //     unsubscribe2();
  //   };
  // }, []);

  return null; // Component JSX would go here
}

// ==========================================
// BROWSER CONSOLE TESTING FUNCTIONS
// ==========================================

/**
 * Add these functions to window for easy browser console testing
 */
if (typeof window !== "undefined") {
  (
    window as unknown as {
      testAvatarSignals?: {
        cheer: typeof cheerAvatar;
        love: typeof loveAvatar;
        click: typeof clickAvatar;
        setState: typeof setAvatarState;
        gotItem: typeof playerGotItem;
        tookDamage: typeof playerTookDamage;
        levelUp: typeof playerLeveledUp;
      };
    }
  ).testAvatarSignals = {
    cheer: cheerAvatar,
    love: loveAvatar,
    click: clickAvatar,
    setState: setAvatarState,
    gotItem: playerGotItem,
    tookDamage: playerTookDamage,
    levelUp: playerLeveledUp,
  };

}

/**
 * USAGE EXAMPLES:
 *
 * // From any React component:
 * import { cheerAvatar, loveAvatar } from '@/utils/AvatarSignals';
 *
 * function MyButton() {
 *   return (
 *     <button onClick={cheerAvatar}>
 *       Make Avatar Cheer!
 *     </button>
 *   );
 * }
 *
 * // From game logic:
 * import { playerGotItem } from '@/utils/AvatarSignals';
 *
 * function handleItemPickup(item) {
 *   playerGotItem(item.name, item.value);
 *   // Avatar will automatically react to this signal
 * }
 *
 * // From browser console (for testing):
 * testAvatarSignals.cheer();
 * testAvatarSignals.setState("heart_idle");
 * testAvatarSignals.gotItem("potion", 50);
 */

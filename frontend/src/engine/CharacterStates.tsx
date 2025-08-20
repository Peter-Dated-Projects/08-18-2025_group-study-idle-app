import { AnimationState } from "./CharacterAnimation";
import { AnimatedTile } from "./Tilemap";

/**
 * CheerIdle animation state that loops the cheer_idle animation forever
 */
export class CheerIdleAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("cheer_idle", animatedTile);
  }

  onEnter(): void {
    console.log("🎉 Entering cheer_idle state");
    // Reset animation to beginning
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(deltaTime: number): string | null {
    // The AnimatedTile will handle automatic frame progression
    // through the updateAnimatedTiles function
    // This state just loops forever - no transitions
    return null;
  }

  onExit(): void {
    console.log("👋 Exiting cheer_idle state");
  }
}

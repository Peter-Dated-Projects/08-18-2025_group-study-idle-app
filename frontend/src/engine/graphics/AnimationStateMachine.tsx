import * as PIXI from "pixi.js";
import { AnimatedTile } from "../resources/Tilemap";

// Interface for animation frame data
interface AnimationFrameData {
  frameIndex?: number;
  texture?: PIXI.Texture;
  [key: string]: unknown;
}

/**
 * Base AnimationState class that acts as a template for specific animation states
 * Users should extend this class to create custom animation behaviors
 */
export abstract class AnimationState {
  public id: string;
  public transitionTargets: Map<string, string> = new Map();
  public parent: CharacterAnimation | null = null;
  protected animatedTile: AnimatedTile;
  protected waitTime: number = 0;
  protected counter: number = 0;

  constructor(id: string, animatedTile: AnimatedTile) {
    this.id = id;
    this.animatedTile = animatedTile;
  }

  /**
   * Called when entering this state
   */
  abstract onEnter(): void;

  /**
   * Called every frame while in this state
   * @param deltaTime - Time elapsed since last update
   * @returns The ID of the next state to transition to, or null to stay in current state
   */
  abstract onUpdate(deltaTime: number): string | null;

  /**
   * Called when exiting this state
   */
  abstract onExit(): void;

  /**
   * Called when the animation completes a full loop (returns to frame 0)
   * Override this method to handle animation loop events
   */
  public onAnimationLoop(): void {
    // Default implementation - do nothing
    // Individual states can override this to respond to animation loops
  }

  /**
   * Add a transition target for this state
   * @param triggerEvent - The event that triggers this transition
   * @param targetStateId - The state to transition to when this event occurs
   */
  public addTransition(triggerEvent: string, targetStateId: string): void {
    this.transitionTargets.set(triggerEvent, targetStateId);
  }

  /**
   * Handle a transition event
   * @param event - The transition event to handle
   * @returns The target state ID if transition should occur, null otherwise
   */
  public handleTransition(event: string): string | null {
    return this.transitionTargets.get(event) || null;
  }

  /**
   * Get the animated tile for this state
   * @returns The animated tile associated with this state
   */
  public getAnimatedTile(): AnimatedTile {
    return this.animatedTile;
  }
}

/**
 * Main CharacterAnimation class that manages animation states
 * Acts as a state machine for various animation states
 */
export class CharacterAnimation {
  private states: Map<string, AnimationState> = new Map();
  private currentState: AnimationState | null = null;
  private previousState: AnimationState | null = null;
  private pendingTransition: string | null = null; // NEW: Store pending transition
  private pendingTransitionResetFrame: boolean = true; // NEW: Whether to reset frame on transition
  private sprite: PIXI.Sprite;
  private debugGraphics?: PIXI.Graphics;

  // Optional callback for when animation loops complete
  public onAnimationLoopCallback?: () => void;

  constructor(sprite: PIXI.Sprite) {
    this.sprite = sprite;
  }

  /**
   * Add an animation state to this character animation
   * @param state - The animation state to add
   */
  public addState(state: AnimationState): void {
    state.parent = this;
    this.states.set(state.id, state);
  }

  /**
   * Set the current animation state
   * @param stateId - The ID of the state to transition to
   * @param resetFrame - Whether to reset animation frame to 0 (default: true)
   */
  public setState(stateId: string, resetFrame: boolean = true): void {
    // Instead of immediate transition, queue it for next update
    this.pendingTransition = stateId;
    this.pendingTransitionResetFrame = resetFrame;
  }

  /**
   * Process pending transition and execute it immediately
   * @param stateId - The ID of the state to transition to
   * @param resetFrame - Whether to reset the animation frame
   */
  private executeTransition(stateId: string, resetFrame: boolean): void {
    const newState = this.states.get(stateId);
    if (!newState) {
      console.warn(`State '${stateId}' not found`);
      return;
    }

    // Store previous state before transitioning
    this.previousState = this.currentState;

    // Store current frame if we're not resetting
    let preservedFrame = 0;
    if (!resetFrame && this.currentState) {
      preservedFrame = this.currentState.getAnimatedTile().currentFrame;
    }

    // Exit current state
    if (this.currentState) {
      this.currentState.onExit();
    }

    // Set new state
    this.currentState = newState;

    // Enter new state
    this.currentState.onEnter();

    // If not resetting frame, restore the preserved frame
    if (!resetFrame) {
      const newAnimatedTile = this.currentState.getAnimatedTile();
      // Only restore if the frame is valid for the new animation
      if (preservedFrame < newAnimatedTile.animationFrames.length) {
        newAnimatedTile.currentFrame = preservedFrame;
        // .animationFrameData?.[preservedFrame]?.frameIndex || "unknown"
        //   }`
        // );
      } else {
        // `
        // );
      }
    } else {
      // Reset frame to 0 for new state
    }

    // CRITICAL: Immediately update sprite display after state transition
    // This ensures the sprite shows the correct frame from the new state
    // before any frame advancement logic runs
    this.updateSpriteDisplayImmediate();

    // `);
  }

  /**
   * Transition to a target state based on an event
   * @param event - The transition event
   */
  public handleTransition(event: string): void {
    if (this.currentState) {
      const targetStateId = this.currentState.handleTransition(event);
      if (targetStateId) {
        this.setState(targetStateId);
      }
    }
  }

  /**
   * Direct transition to a specific state (internal method)
   * @param stateId - The ID of the state to transition to
   * @param resetFrame - Whether to reset animation frame to 0 (default: true)
   */
  public transitionTo(stateId: string, resetFrame: boolean = true): void {
    // Queue transition for next update
    this.pendingTransition = stateId;
    this.pendingTransitionResetFrame = resetFrame;
  }

  /**
   * Update the character animation
   * @param deltaTime - Time elapsed since last update
   */
  public update(deltaTime: number): void {
    // FIRST: Process any pending transitions before updating current state
    if (this.pendingTransition) {
      this.executeTransition(this.pendingTransition, this.pendingTransitionResetFrame);
      this.pendingTransition = null; // Clear pending transition
      this.pendingTransitionResetFrame = true; // Reset to default
    }

    // THEN: Update current state
    if (this.currentState) {
      // Let current state update and potentially request transition
      const nextStateId = this.currentState.onUpdate(deltaTime);
      if (nextStateId) {
        // Queue the transition for next update cycle (default to reset frame)
        this.pendingTransition = nextStateId;
        this.pendingTransitionResetFrame = true;
      }

      // Update visual representation
      this.updateSpriteDisplay();
    }
  }

  /**
   * Update the sprite display based on current animation state
   */
  private updateSpriteDisplay(): void {
    if (!this.sprite || !this.currentState) return;

    const animatedTile = this.currentState.getAnimatedTile();
    const animationTextures = (animatedTile as unknown as Record<string, unknown>)
      .animationTextures;
    const animationFrameData = (animatedTile as unknown as Record<string, unknown>)
      .animationFrameData; // Store original frame data

    if (!animationTextures || !Array.isArray(animationTextures) || animationTextures.length === 0)
      return;

    // Calculate frame progression
    const currentTime = Date.now();
    const timeSinceLastFrame = currentTime - animatedTile.lastFrameTime;

    if (timeSinceLastFrame >= animatedTile.frameDuration) {
      const prevFrameIndex = animatedTile.currentFrame;

      // If a state transition is pending, don't advance the frame
      const nextFrameIndex = this.pendingTransition
        ? prevFrameIndex // Keep same frame if transition is pending
        : (prevFrameIndex + 1) % animationTextures.length;

      // Get global frame IDs for logging
      const currentGlobalFrameId = Array.isArray(animationFrameData)
        ? animationFrameData[prevFrameIndex]?.frameIndex
        : "unknown";
      const nextGlobalFrameId = Array.isArray(animationFrameData)
        ? animationFrameData[nextFrameIndex]?.frameIndex
        : "unknown";

      // Log frame change with global frame IDs

      // Check if animation loop completed (wrapped back to 0) - but only if no pending transition
      if (
        !this.pendingTransition &&
        nextFrameIndex === 0 &&
        prevFrameIndex === animationTextures.length - 1
      ) {
        // Call state-specific animation loop callback
        this.currentState.onAnimationLoop();

        // Call global animation loop callback if set
        if (this.onAnimationLoopCallback) {
          this.onAnimationLoopCallback();
        }
      }

      if (this.pendingTransition) {
        // If a transition is pending, hold the current frame
        animatedTile.currentFrame = prevFrameIndex;
      } else {
        animatedTile.currentFrame = nextFrameIndex;
      }

      animatedTile.lastFrameTime = currentTime;
    }

    // Update sprite texture
    const currentTexture = animationTextures[animatedTile.currentFrame];
    if (currentTexture) {
      this.sprite.texture = currentTexture;

      // Update the animatedTile's sprite texture as well
      if (animatedTile.sprite) {
        animatedTile.sprite.texture = currentTexture;
      }
    }
  }

  /**
   * Immediately update sprite display without frame advancement
   * Used during state transitions to show correct frame immediately
   */
  private updateSpriteDisplayImmediate(): void {
    if (!this.sprite || !this.currentState) return;

    const animatedTile = this.currentState.getAnimatedTile();
    const animationTextures = (
      animatedTile as unknown as AnimatedTile & { animationTextures?: PIXI.Texture[] }
    ).animationTextures;

    if (!animationTextures || animationTextures.length === 0) return;

    // Update sprite texture to current frame without advancing
    const currentTexture = animationTextures[animatedTile.currentFrame];
    if (currentTexture) {
      this.sprite.texture = currentTexture;

      // Update the animatedTile's sprite texture as well
      if (animatedTile.sprite) {
        animatedTile.sprite.texture = currentTexture;
      }
    }
  }

  /**
   * Get the current animation state
   */
  public getCurrentState(): AnimationState | null {
    return this.currentState;
  }

  /**
   * Get the current state ID
   */
  public getCurrentStateId(): string | null {
    return this.currentState?.id || null;
  }

  /**
   * Get the previous animation state
   */
  public getPreviousState(): AnimationState | null {
    return this.previousState;
  }

  /**
   * Get the previous state ID
   */
  public getPreviousStateId(): string | null {
    return this.previousState?.id || null;
  }

  /**
   * Get the main sprite used for rendering
   */
  public getSprite(): PIXI.Sprite {
    return this.sprite;
  }

  /**
   * Get all available state IDs
   */
  public getAvailableStates(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * Check if a state exists
   * @param stateId - The ID of the state to check
   */
  public hasState(stateId: string): boolean {
    return this.states.has(stateId);
  }

  /**
   * Destroy this character animation and clean up resources
   */
  public destroy(): void {
    // Exit current state
    if (this.currentState) {
      this.currentState.onExit();
    }

    // Clear all states
    this.states.clear();
    this.currentState = null;
    this.previousState = null;
    this.pendingTransition = null; // Clear pending transition
    this.pendingTransitionResetFrame = true; // Reset to default

    // Remove debug graphics if present
    if (this.debugGraphics && this.debugGraphics.parent) {
      this.debugGraphics.parent.removeChild(this.debugGraphics);
    }
  }
}

/**
 * Helper function to create an AnimatedTile with proper setup
 */
export function createAnimatedTileForState(
  stateId: string,
  animationFrames: AnimationFrameData[],
  sprite: PIXI.Sprite,
  frameDuration: number = 150
): AnimatedTile {
  const tile: AnimatedTile = {
    id: stateId,
    x: 0,
    y: 0,
    animationFrames: animationFrames.map((f, i) => i.toString()),
    frameDuration,
    currentFrame: 0,
    lastFrameTime: Date.now(),
    sprite: sprite,
  };

  // Add the textures array as a custom property
  (tile as unknown as Record<string, unknown>).animationTextures = animationFrames.map(
    (f) => f.texture
  );

  // Store original frame data for logging global frame IDs
  (tile as unknown as Record<string, unknown>).animationFrameData = animationFrames;

  return tile;
}

/**
 * Helper function to create a state with its animated tile
 */
export function createStateWithAnimatedTile<T extends AnimationState>(
  stateId: string,
  StateClass: new (tile: AnimatedTile) => T,
  animationFrames: AnimationFrameData[],
  sprite: PIXI.Sprite,
  frameDuration: number = 150
): T {
  const tile = createAnimatedTileForState(stateId, animationFrames, sprite, frameDuration);
  return new StateClass(tile);
}

/**
 * Builder class for creating CharacterAnimation instances with fluent API
 */
export class CharacterAnimationBuilder {
  private characterAnimation: CharacterAnimation;

  constructor(sprite: PIXI.Sprite) {
    this.characterAnimation = new CharacterAnimation(sprite);
  }

  /**
   * Add a state to the character animation
   */
  public addState<T extends AnimationState>(
    stateId: string,
    StateClass: new (tile: AnimatedTile) => T,
    animationFrames: AnimationFrameData[],
    frameDuration: number = 150
  ): CharacterAnimationBuilder {
    if (animationFrames && animationFrames.length > 0) {
      const state = createStateWithAnimatedTile(
        stateId,
        StateClass,
        animationFrames,
        this.characterAnimation.getSprite(),
        frameDuration
      );
      this.characterAnimation.addState(state);
    }
    return this;
  }

  /**
   * Add a transition between states
   */
  public addTransition(
    fromStateId: string,
    event: string,
    toStateId: string
  ): CharacterAnimationBuilder {
    const fromState = this.characterAnimation.hasState(fromStateId);
    if (fromState) {
      // We need to get the actual state instance to add the transition
      // This is a limitation of the current design - let's note it for future improvement
    }
    return this;
  }

  /**
   * Build the CharacterAnimation and set the initial state
   */
  public build(initialStateId: string): CharacterAnimation {
    this.characterAnimation.setState(initialStateId);
    return this.characterAnimation;
  }
}

/**
 * USAGE EXAMPLES:
 *
 * // Basic state transitions (default behavior - resets frame to 0)
 * characterAnimation.setState("walk");
 * characterAnimation.transitionTo("idle");
 *
 * // Transition without resetting animation frame (continues from current frame)
 * characterAnimation.setState("walk", false); // Don't reset frame
 * characterAnimation.transitionTo("run", false); // Don't reset frame
 *
 * // Useful for smooth transitions between similar animations
 * // Example: transitioning from walk_left to walk_right without frame reset
 * // maintains the walking cycle continuity
 *
 * // In signal handlers:
 * private handleQuickTransition(): void {
 *   // Quick transition that doesn't interrupt current animation cycle
 *   this.characterAnimation.setState("alert", false);
 * }
 *
 * // In state machines:
 * class WalkState extends AnimationState {
 *   onUpdate(deltaTime: number): string | null {
 *     if (this.shouldTransitionToRun()) {
 *       // Smooth transition to running - don't reset the walk cycle
 *       if (this.parent) {
 *         this.parent.setState("run", false);
 *       }
 *       return null; // Don't use return value since we called setState directly
 *     }
 *     return null;
 *   }
 * }
 */

import * as PIXI from "pixi.js";
import { AnimatedTile } from "./Tilemap";

/**
 * Base AnimationState class that acts as a template for specific animation states
 * Users should extend this class to create custom animation behaviors
 */
export abstract class AnimationState {
  public readonly id: string;
  protected parent: CharacterAnimation | null = null;
  protected transitionTargets: Map<string, string> = new Map(); // condition -> target state id
  protected animatedTile: AnimatedTile;

  constructor(id: string, animatedTile: AnimatedTile) {
    this.id = id;
    this.animatedTile = animatedTile;
  }

  /**
   * Called when this state becomes active
   */
  abstract onEnter(): void;

  /**
   * Called every frame while this state is active
   * @param deltaTime - Time elapsed since last frame in seconds
   * @returns The ID of the next state to transition to, or null to stay in current state
   */
  abstract onUpdate(deltaTime: number): string | null;

  /**
   * Called when this state becomes inactive
   */
  abstract onExit(): void;

  /**
   * Add a transition condition to another state
   * @param condition - The condition identifier (e.g., "walk", "idle", "attack")
   * @param targetStateId - The ID of the state to transition to
   */
  public addTransition(condition: string, targetStateId: string): void {
    this.transitionTargets.set(condition, targetStateId);
  }

  /**
   * Check if a transition condition exists
   * @param condition - The condition to check
   * @returns The target state ID or null if condition doesn't exist
   */
  public getTransitionTarget(condition: string): string | null {
    return this.transitionTargets.get(condition) || null;
  }

  /**
   * Set the parent CharacterAnimation reference
   * @param parent - The CharacterAnimation instance this state belongs to
   */
  public setParent(parent: CharacterAnimation): void {
    this.parent = parent;
  }

  /**
   * Get the animated tile for this state
   */
  public getAnimatedTile(): AnimatedTile {
    return this.animatedTile;
  }

  /**
   * Trigger a transition condition from within the state
   * @param condition - The condition to trigger
   */
  protected triggerTransition(condition: string): void {
    if (this.parent) {
      this.parent.handleTransition(condition);
    }
  }
}

/**
 * Example template animation states that users can extend
 */

/**
 * Idle animation state - plays a looping idle animation
 */
export class IdleAnimationState extends AnimationState {
  private idleTimer: number = 0;
  private idleDuration: number;

  constructor(animatedTile: AnimatedTile, idleDuration: number = 2.0) {
    super("idle", animatedTile);
    this.idleDuration = idleDuration;
  }

  onEnter(): void {
    this.idleTimer = 0;
    console.log(`Entered idle state`);
    // Set animation to idle frames (assuming frames 0-3 are idle)
    this.animatedTile.currentFrame = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.idleTimer += deltaTime;

    // Simple idle animation cycle
    const frameIndex = Math.floor((this.idleTimer * 4) % 4); // 4 FPS animation
    this.animatedTile.currentFrame = frameIndex;

    // Example: transition to walk after some time or based on input
    // This would typically be triggered by external input/conditions
    return null; // Stay in idle
  }

  onExit(): void {
    console.log(`Exited idle state`);
  }
}

/**
 * Walk animation state - plays a walking animation
 */
export class WalkAnimationState extends AnimationState {
  private walkSpeed: number;
  private direction: { x: number; y: number } = { x: 0, y: 0 };

  constructor(animatedTile: AnimatedTile, walkSpeed: number = 100) {
    super("walk", animatedTile);
    this.walkSpeed = walkSpeed;
  }

  onEnter(): void {
    console.log(`Entered walk state`);
    // Set animation to walk frames (assuming frames 4-7 are walk)
    this.animatedTile.currentFrame = 4;
  }

  onUpdate(deltaTime: number): string | null {
    // Animate walk cycle
    const frameIndex = 4 + Math.floor((Date.now() * 0.008) % 4); // 8 FPS animation
    this.animatedTile.currentFrame = frameIndex;

    // Move the character (this would update position)
    // this.animatedTile.x += this.direction.x * this.walkSpeed * deltaTime;
    // this.animatedTile.y += this.direction.y * this.walkSpeed * deltaTime;

    // Example: stop walking when no input
    // This would typically check for input or movement conditions
    return null; // Stay in walk
  }

  onExit(): void {
    console.log(`Exited walk state`);
  }

  public setDirection(x: number, y: number): void {
    this.direction.x = x;
    this.direction.y = y;
  }
}

/**
 * Main CharacterAnimation class that manages the state machine
 */
export class CharacterAnimation {
  private states: Map<string, AnimationState> = new Map();
  private currentState: AnimationState | null = null;
  private sprite: PIXI.Sprite;
  private lastUpdateTime: number = 0;

  /**
   * Create a new CharacterAnimation state machine
   * @param sprite - The PIXI sprite that will display the character
   * @param initialStates - Array of initial animation states
   */
  constructor(sprite: PIXI.Sprite, initialStates: AnimationState[] = []) {
    this.sprite = sprite;

    // Add initial states
    initialStates.forEach((state) => this.addState(state));
  }

  /**
   * Add a new animation state to the state machine
   * @param state - The AnimationState to add
   */
  public addState(state: AnimationState): void {
    state.setParent(this);
    this.states.set(state.id, state);

    // If this is the first state, make it current
    if (!this.currentState) {
      this.currentState = state;
      state.onEnter();
    }
  }

  /**
   * Remove an animation state from the state machine
   * @param stateId - The ID of the state to remove
   */
  public removeState(stateId: string): void {
    const state = this.states.get(stateId);
    if (state) {
      if (this.currentState === state) {
        state.onExit();
        this.currentState = null;
      }
      this.states.delete(stateId);
    }
  }

  /**
   * Transition to a specific state
   * @param stateId - The ID of the state to transition to
   */
  public transitionTo(stateId: string): boolean {
    const newState = this.states.get(stateId);
    if (!newState) {
      console.warn(`State '${stateId}' not found`);
      return false;
    }

    if (this.currentState === newState) {
      return true; // Already in this state
    }

    // Exit current state
    if (this.currentState) {
      this.currentState.onExit();
    }

    // Enter new state
    this.currentState = newState;
    this.currentState.onEnter();

    console.log(`Transitioned to state: ${stateId}`);
    return true;
  }

  /**
   * Handle transition conditions (called by AnimationState instances)
   * @param condition - The condition that triggered the transition
   */
  public handleTransition(condition: string): void {
    if (!this.currentState) return;

    const targetStateId = this.currentState.getTransitionTarget(condition);
    if (targetStateId) {
      this.transitionTo(targetStateId);
    }
  }

  /**
   * Update the character animation system
   * @param deltaTime - Time elapsed since last frame in seconds
   */
  public update(deltaTime: number): void {
    if (!this.currentState) return;

    this.lastUpdateTime = deltaTime;

    // Update current state
    const nextStateId = this.currentState.onUpdate(deltaTime);

    // Handle automatic state transitions
    if (nextStateId) {
      this.transitionTo(nextStateId);
    }

    // Update sprite texture based on current animated tile
    this.updateSpriteDisplay();
  }

  /**
   * Update the sprite display based on the current state's animated tile
   */
  private updateSpriteDisplay(): void {
    if (!this.currentState) return;

    const animatedTile = this.currentState.getAnimatedTile();

    // Handle frame progression for the animated tile
    const currentTime = Date.now();
    const timeSinceLastFrame = currentTime - animatedTile.lastFrameTime;

    if (timeSinceLastFrame >= animatedTile.frameDuration) {
      // Advance to next frame
      animatedTile.currentFrame =
        (animatedTile.currentFrame + 1) % animatedTile.animationFrames.length;
      animatedTile.lastFrameTime = currentTime;

      // Update the sprite texture if we have animation textures stored
      if (
        (animatedTile as any).animationTextures &&
        (animatedTile as any).animationTextures[animatedTile.currentFrame]
      ) {
        this.sprite.texture = (animatedTile as any).animationTextures[animatedTile.currentFrame];
        // Also update the animated tile's sprite texture
        if (animatedTile.sprite) {
          animatedTile.sprite.texture = (animatedTile as any).animationTextures[
            animatedTile.currentFrame
          ];
        }
      }
    }

    // Update sprite texture if the animated tile has a sprite with texture
    if (animatedTile.sprite && animatedTile.sprite.texture) {
      this.sprite.texture = animatedTile.sprite.texture;
    }

    // You could also update other sprite properties here based on the animated tile
    // this.sprite.x = animatedTile.x;
    // this.sprite.y = animatedTile.y;
    // this.sprite.scale.set(animatedTile.scaleX || 1);
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
   * Get all available states
   */
  public getStates(): Map<string, AnimationState> {
    return new Map(this.states);
  }

  /**
   * Check if a state exists
   */
  public hasState(stateId: string): boolean {
    return this.states.has(stateId);
  }

  /**
   * Get the PIXI sprite
   */
  public getSprite(): PIXI.Sprite {
    return this.sprite;
  }

  /**
   * Destroy the character animation system
   */
  public destroy(): void {
    if (this.currentState) {
      this.currentState.onExit();
    }
    this.states.clear();
    this.currentState = null;
  }
}

/**
 * USAGE EXAMPLE:
 *
 * // 1. Create animated tiles for different animation states
 * const idleAnimatedTile: AnimatedTile = {
 *   id: "player-idle",
 *   x: 0,
 *   y: 0,
 *   animationFrames: ["idle-0", "idle-1", "idle-2", "idle-3"],
 *   frameDuration: 250, // 250ms per frame
 *   currentFrame: 0,
 *   lastFrameTime: 0,
 *   sprite: new PIXI.Sprite() // This will be updated with the current frame texture
 * };
 *
 * const walkAnimatedTile: AnimatedTile = {
 *   id: "player-walk",
 *   x: 0,
 *   y: 0,
 *   animationFrames: ["walk-0", "walk-1", "walk-2", "walk-3"],
 *   frameDuration: 125, // 125ms per frame for faster walk animation
 *   currentFrame: 0,
 *   lastFrameTime: 0,
 *   sprite: new PIXI.Sprite()
 * };
 *
 * // 2. Create animation states
 * const idleState = new IdleAnimationState(idleAnimatedTile);
 * const walkState = new WalkAnimationState(walkAnimatedTile);
 *
 * // 3. Set up transitions between states
 * idleState.addTransition("startWalking", "walk");
 * walkState.addTransition("stopWalking", "idle");
 *
 * // 4. Create character sprite and animation system
 * const characterSprite = new PIXI.Sprite();
 * const characterAnim = new CharacterAnimation(characterSprite, [idleState, walkState]);
 *
 * // 5. Add to PIXI stage
 * stage.addChild(characterSprite);
 *
 * // 6. In your game loop, update both animated tiles and character animation:
 * app.ticker.add((ticker) => {
 *   const deltaTime = ticker.deltaTime / 60; // Convert to seconds
 *
 *   // Update animated tiles (this handles frame progression)
 *   updateAnimatedTiles([idleAnimatedTile, walkAnimatedTile], ticker.lastTime);
 *
 *   // Update character animation state machine
 *   characterAnim.update(deltaTime);
 * });
 *
 * // 7. Trigger transitions based on input:
 * document.addEventListener('keydown', (e) => {
 *   if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
 *     characterAnim.handleTransition("startWalking");
 *   }
 * });
 *
 * document.addEventListener('keyup', (e) => {
 *   if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
 *     characterAnim.handleTransition("stopWalking");
 *   }
 * });
 */

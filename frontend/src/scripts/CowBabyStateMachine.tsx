import {
  AnimationState,
  CharacterAnimation,
  CharacterAnimationBuilder,
} from "../engine/graphics/AnimationStateMachine";
import { AnimatedTile } from "../engine/resources/Tilemap";
import { AnimationLoader } from "@/engine/graphics/AnimationLoader";
import { Rigidbody } from "@/engine/physics/Rigidbody";
import { Vec2 } from "@/engine/physics/Vec2";
import { RectangleCollider, createRectangleCollider, isCollided } from "@/engine/physics/Collider";
import * as PIXI from "pixi.js";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../components/garden/GardenCanvas";

// Local interface for animation frame data to match CharacterAnimation expectations
interface AnimationFrameData {
  frameIndex?: number;
  texture?: PIXI.Texture;
  [key: string]: unknown;
}

/**
 * CowBaby class that manages both rigidbody physics and animation state machine
 */
export class CowBaby {
  public rigidbody: Rigidbody;
  public characterAnimation: CharacterAnimation;
  private walkTarget: { x: number; y: number } | null = null;
  private previousStateId: string | null = null;
  private stateTimer: number = 0; // Timer to prevent getting stuck in states
  private maxStateTime: number = 10000; // Max 10 seconds in any state

  constructor(rigidbody: Rigidbody, characterAnimation: CharacterAnimation) {
    this.rigidbody = rigidbody;
    this.characterAnimation = characterAnimation;
    this.previousStateId = this.characterAnimation.getCurrentState()?.id || null;
  }

  public update(deltaTime: number, staticColliders?: RectangleCollider[]): void {
    // Update state timer
    this.stateTimer += deltaTime * 1000;

    // Update animation state machine
    this.characterAnimation.update(deltaTime);

    // Check if animation state changed
    const currentStateId = this.characterAnimation.getCurrentState()?.id || null;
    if (currentStateId !== this.previousStateId) {
      this.rigidbody.isChanged = true;
      this.previousStateId = currentStateId;
      this.stateTimer = 0; // Reset timer when state changes
    }

    // Safety check: if no current state, force to idle
    if (!currentStateId) {
      this.characterAnimation.transitionTo("idle");
      this.rigidbody.stop();
      this.walkTarget = null;
      this.stateTimer = 0;
      return;
    }

    // Safety timeout: if stuck in any state for too long, return to idle
    if (this.stateTimer > this.maxStateTime) {
      this.characterAnimation.transitionTo("idle");
      this.rigidbody.stop();
      this.walkTarget = null;
      this.stateTimer = 0;
      return;
    }

    // Handle movement based on current state
    if (currentStateId === "walk") {
      // If just entered walk state and no target set, create one
      if (!this.walkTarget) {
        this.startWalking();
      }

      if (this.walkTarget) {
        // Store previous position for collision resolution
        const prevX = this.rigidbody.position.x;
        const prevY = this.rigidbody.position.y;

        // Move towards target when walking
        const dx = this.walkTarget.x - this.rigidbody.position.x;
        const dy = this.walkTarget.y - this.rigidbody.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Use variable speed between 30-80 pixels per second as requested
        const minSpeed = 30;
        const maxSpeed = 80;
        const currentSpeed = minSpeed + Math.random() * (maxSpeed - minSpeed);
        this.rigidbody.setMaxSpeed(currentSpeed);

        // Check if we're within 5% of the target distance (minimum 5 pixels)
        const targetThreshold = Math.max(5, distance * 0.05);

        if (distance > targetThreshold) {
          // Use moveTowards with desired speed for smooth movement
          this.rigidbody.moveTowards(this.walkTarget.x, this.walkTarget.y, currentSpeed);
        } else {
          // We're close enough - stop and clear target
          this.rigidbody.stop();
          this.walkTarget = null;
        }

        // Update rigidbody physics first
        this.rigidbody.update();

        // Check for collisions with static objects
        if (staticColliders && this.checkCollisionWith(staticColliders)) {
          // Revert position if collision detected
          this.rigidbody.setPosition(new Vec2(prevX, prevY));
          this.rigidbody.stop();
          this.walkTarget = null;
          // Force transition to idle state instead of returning early
          this.characterAnimation.transitionTo("idle");
        }
      }
    } else {
      // Stop movement when not walking
      this.rigidbody.stop();
      this.walkTarget = null;

      // Update rigidbody physics
      this.rigidbody.update();
    }

    // Boundary checking - keep cow babies within 150px of the camera center as requested
    const centerX = DESIGN_WIDTH / 2;
    const centerY = DESIGN_HEIGHT / 2;
    const deltaX = this.rigidbody.position.x - centerX;
    const deltaY = this.rigidbody.position.y - centerY;
    const centerDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    let boundsChanged = false;

    if (centerDistance > 150) {
      // Changed from 200px to 150px as requested
      // Move cow back to 150px radius from the camera center
      const scale = 150 / centerDistance;
      const constrainedX = centerX + deltaX * scale;
      const constrainedY = centerY + deltaY * scale;
      this.rigidbody.setPosition(new Vec2(constrainedX, constrainedY));
      boundsChanged = true;
    }

    // Also apply screen boundaries as secondary constraint (fallback)
    const padding = 50;

    if (this.rigidbody.position.x < padding) {
      this.rigidbody.setPosition(new Vec2(padding, this.rigidbody.position.y));
      boundsChanged = true;
    } else if (this.rigidbody.position.x > DESIGN_WIDTH - padding) {
      this.rigidbody.setPosition(new Vec2(DESIGN_WIDTH - padding, this.rigidbody.position.y));
      boundsChanged = true;
    }

    if (this.rigidbody.position.y < padding) {
      this.rigidbody.setPosition(new Vec2(this.rigidbody.position.x, padding));
      boundsChanged = true;
    } else if (this.rigidbody.position.y > DESIGN_HEIGHT - padding) {
      this.rigidbody.setPosition(new Vec2(this.rigidbody.position.x, DESIGN_HEIGHT - padding));
      boundsChanged = true;
    }

    // If we hit boundaries while walking, stop and go idle
    if (boundsChanged && currentStateId === "walk") {
      this.rigidbody.stop();
      this.walkTarget = null;
      this.characterAnimation.transitionTo("idle");
    }

    // Ensure sprite visibility and properties
    const sprite = this.characterAnimation.getSprite();
    if (sprite) {
      sprite.visible = true;
      sprite.alpha = 1.0;
      // Ensure sprite position matches rigidbody position
      sprite.position.set(this.rigidbody.position.x, this.rigidbody.position.y);

      // Set z-index to negative y-value as requested
      sprite.zIndex = this.rigidbody.position.y;
    }
  }

  public startWalking(): void {
    // Set random target position within 50-100px with constraints for 150px radius from center
    const currentX = this.rigidbody.position.x;
    const currentY = this.rigidbody.position.y;

    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 50 + 50; // 50-100 pixels (smaller range for 150px constraint)

    let targetX = currentX + Math.cos(angle) * distance;
    let targetY = currentY + Math.sin(angle) * distance;

    // Constrain target to 150px radius from camera center as requested
    const centerX = DESIGN_WIDTH / 2;
    const centerY = DESIGN_HEIGHT / 2;
    const centerDeltaX = targetX - centerX;
    const centerDeltaY = targetY - centerY;
    const centerDistance = Math.sqrt(centerDeltaX * centerDeltaX + centerDeltaY * centerDeltaY);

    if (centerDistance > 150) {
      const scale = 150 / centerDistance;
      targetX = centerX + centerDeltaX * scale;
      targetY = centerY + centerDeltaY * scale;
    }

    // Also constrain to screen boundaries (with padding) as fallback
    const padding = 50;
    targetX = Math.max(padding, Math.min(DESIGN_WIDTH - padding, targetX));
    targetY = Math.max(padding, Math.min(DESIGN_HEIGHT - padding, targetY));

    this.walkTarget = {
      x: targetX,
      y: targetY,
    };
  }

  public getCollider(): RectangleCollider {
    return createRectangleCollider(
      this.rigidbody.position.x,
      this.rigidbody.position.y,
      this.rigidbody.collider?.size.x || 32 * 3,
      this.rigidbody.collider?.size.y || 32 * 3
    );
  }

  public checkCollisionWith(colliders: RectangleCollider[]): boolean {
    const cowCollider = this.getCollider();
    return colliders.some((collider) => isCollided([cowCollider, collider]));
  }

  public resetToIdle(): void {
    this.characterAnimation.transitionTo("idle");
    this.rigidbody.stop();
    this.walkTarget = null;
    this.stateTimer = 0;
    this.rigidbody.isChanged = true;
  }
}

/**
 * Idle animation state for cow baby
 * Uses proper delta time and weighted random state selection
 */
export class CowIdleAnimationState extends AnimationState {
  public idleTransitions = [
    { state: "idle_blink", weight: 15 },
    { state: "walk", weight: 20 },
    { state: "hop", weight: 10 },
    { state: "stand", weight: 12 },
    { state: "sit", weight: 8 },
    { state: "sniff_ground", weight: 15 },
    { state: "eat_grass_idle", weight: 12 },
    { state: "idle_heart", weight: 8 },
  ];

  constructor(animatedTile: AnimatedTile) {
    super("idle", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Random wait time between 1.5-3.5 seconds (more reasonable for pets)
    this.waitTime = (Math.random() * 2.0 + 1.5) * 1000; // 1500-3500ms
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter >= this.waitTime) {
      // Weighted random state selection
      const totalWeight = this.idleTransitions.reduce(
        (sum, transition) => sum + transition.weight,
        0
      );
      let randomValue = Math.random() * totalWeight;

      for (const transition of this.idleTransitions) {
        randomValue -= transition.weight;
        if (randomValue <= 0) {
          return transition.state;
        }
      }

      // Fallback to first transition
      return this.idleTransitions[0].state;
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Idle blink animation state
 * Short animation with precise timing
 */
export class CowIdleBlinkAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("idle_blink", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Calculate animation length (2 frames) - precise timing
    this.waitTime = 2 * this.animatedTile.frameDuration;
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter >= this.waitTime) {
      return "idle";
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Walk animation state
 * Manages movement duration with delta time
 */
export class CowWalkAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("walk", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Set walk duration between 2-5 seconds (longer for more natural movement)
    this.waitTime = (Math.random() * 3.0 + 2.0) * 1000; // 2000-5000ms
    this.counter = 0;

    // Note: Movement will be handled by the BabyCowEntity class that manages this state machine
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter >= this.waitTime) {
      return "idle";
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Hop animation state
 * Quick playful animation
 */
export class CowHopAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("hop", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Calculate animation length (3 frames) with slight pause after
    this.waitTime = 3 * this.animatedTile.frameDuration + 300; // Animation + 300ms pause
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter >= this.waitTime) {
      return "idle";
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Stand animation state
 * Alert watching pose
 */
export class CowStandAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("stand", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Hold stand pose for 2-4 seconds (variable attention span)
    this.waitTime = (Math.random() * 2.0 + 2.0) * 1000; // 2000-4000ms
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter >= this.waitTime) {
      return "idle";
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Sit animation state
 * Resting/relaxed pose
 */
export class CowSitAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("sit", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Sit for 3-6 seconds (variable rest duration)
    this.waitTime = (Math.random() * 3.0 + 3.0) * 1000; // 3000-6000ms
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter >= this.waitTime) {
      return "idle";
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Sniff ground animation state
 * Exploring/investigating behavior
 */
export class CowSniffGroundAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("sniff_ground", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Calculate animation length (8 frames) with possible repeat
    const baseAnimationTime = 8 * this.animatedTile.frameDuration;
    const shouldRepeat = Math.random() < 0.3; // 30% chance to do it twice
    this.waitTime = shouldRepeat ? baseAnimationTime * 2 : baseAnimationTime;
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter >= this.waitTime) {
      return "idle";
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Eat grass idle animation state
 */
export class CowEatGrassIdleAnimationState extends AnimationState {
  private targetRepetitions: number = 0;
  private currentRepetitions: number = 0;
  private animationLength: number = 0;

  constructor(animatedTile: AnimatedTile) {
    super("eat_grass_idle", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Must run 2-3 times before exiting
    this.targetRepetitions = Math.floor(Math.random() * 2) + 2; // 2 or 3
    this.currentRepetitions = 0;

    // Calculate animation length (4 frames)
    this.animationLength = 4 * this.animatedTile.frameDuration;
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    // Check if one full animation cycle completed
    if (this.counter >= this.animationLength) {
      this.currentRepetitions++;

      if (this.currentRepetitions >= this.targetRepetitions) {
        // Finished required repetitions, can only exit to idle
        return "idle";
      } else {
        // Reset for next repetition
        this.counter = 0;
        this.animatedTile.currentFrame = 0;
        this.animatedTile.lastFrameTime = Date.now();
      }
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Idle heart animation state
 * Shows affection/happiness
 */
export class CowIdleHeartAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("idle_heart", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Calculate animation length (11 frames) with brief pause after
    this.waitTime = 11 * this.animatedTile.frameDuration + 500; // Animation + 500ms pause
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter >= this.waitTime) {
      return "idle";
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Fall asleep animation state
 * Rare sleepy behavior
 */
export class CowFallAsleepAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("fall_asleep", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Calculate animation length (2 frames) with longer sleep duration
    this.waitTime = 2 * this.animatedTile.frameDuration + (Math.random() * 3000 + 2000); // Animation + 2-5 seconds sleep
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter >= this.waitTime) {
      return "idle";
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Generate the Cow Baby State Machine
 */
export async function buildCowBabyStateMachine(
  pixiApp: PIXI.Application,
  animationLoader: AnimationLoader
): Promise<CharacterAnimation> {
  // Load the animations first - use 167ms per frame for 6 FPS (1000/6 ≈ 167)
  const cowFrameDuration = 167; // 6 FPS for cows
  await animationLoader.load("/entities/cow_baby.png", "/entities/cow_baby.json", cowFrameDuration);

  // Create a sprite for the character animation
  const sprite = new PIXI.Sprite();

  // Get animation frame data
  const idleFrames = animationLoader.getAnimation("idle");
  const idleBlinkFrames = animationLoader.getAnimation("idle_blink");
  const walkFrames = animationLoader.getAnimation("walk");
  const hopFrames = animationLoader.getAnimation("hop");
  const standFrames = animationLoader.getAnimation("stand");
  const sitFrames = animationLoader.getAnimation("sit");
  const fallAsleepFrames = animationLoader.getAnimation("fall_asleep");
  const sniffGroundFrames = animationLoader.getAnimation("sniff_ground");
  const eatGrassIdleFrames = animationLoader.getAnimation("eat_grass_idle");
  const idleHeartFrames = animationLoader.getAnimation("idle_heart");

  // Use the builder with proper state classes - all using 6 FPS frame duration
  const builder = new CharacterAnimationBuilder(sprite);

  if (idleFrames)
    builder.addState("idle", CowIdleAnimationState, idleFrames.frames as AnimationFrameData[], cowFrameDuration);
  if (idleBlinkFrames)
    builder.addState(
      "idle_blink",
      CowIdleBlinkAnimationState,
      idleBlinkFrames.frames as AnimationFrameData[],
      cowFrameDuration
    );
  if (walkFrames)
    builder.addState("walk", CowWalkAnimationState, walkFrames.frames as AnimationFrameData[], cowFrameDuration);
  if (hopFrames)
    builder.addState("hop", CowHopAnimationState, hopFrames.frames as AnimationFrameData[], cowFrameDuration);
  if (standFrames)
    builder.addState(
      "stand",
      CowStandAnimationState,
      standFrames.frames as AnimationFrameData[],
      cowFrameDuration
    );
  if (sitFrames)
    builder.addState("sit", CowSitAnimationState, sitFrames.frames as AnimationFrameData[], cowFrameDuration);
  if (fallAsleepFrames)
    builder.addState(
      "fall_asleep",
      CowFallAsleepAnimationState,
      fallAsleepFrames.frames as AnimationFrameData[],
      cowFrameDuration
    );
  if (sniffGroundFrames)
    builder.addState(
      "sniff_ground",
      CowSniffGroundAnimationState,
      sniffGroundFrames.frames as AnimationFrameData[],
      cowFrameDuration
    );
  if (eatGrassIdleFrames)
    builder.addState(
      "eat_grass_idle",
      CowEatGrassIdleAnimationState,
      eatGrassIdleFrames.frames as AnimationFrameData[],
      cowFrameDuration
    );
  if (idleHeartFrames)
    builder.addState(
      "idle_heart",
      CowIdleHeartAnimationState,
      idleHeartFrames.frames as AnimationFrameData[],
      cowFrameDuration
    );

  const characterAnimation = builder.build("idle");

  return characterAnimation;
}

/**
 * Factory function to create a complete CowBaby instance
 */
export async function createCowBaby(
  pixiApp: PIXI.Application,
  animationLoader: AnimationLoader,
  x: number,
  y: number,
  worldContainer: PIXI.Container
): Promise<CowBaby> {
  // Create character animation
  const characterAnimation = await buildCowBabyStateMachine(pixiApp, animationLoader);

  // Create rigidbody with the same sprite
  const sprite = characterAnimation.getSprite();
  const size = new Vec2(32 * 3, 32 * 3); // Based on cow_baby frame size scaled by 3
  const rigidbody = new Rigidbody(sprite, size, 80); // Max speed 80 px/s as requested

  // Set position
  rigidbody.setPosition(new Vec2(x, y));

  // Set up sprite properties
  sprite.anchor.set(0.5);
  sprite.scale.set(3);
  sprite.position.set(x, y);
  worldContainer.addChild(sprite);

  return new CowBaby(rigidbody, characterAnimation);
}

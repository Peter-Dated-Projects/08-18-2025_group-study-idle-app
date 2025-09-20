import {
  AnimationState,
  CharacterAnimation,
  CharacterAnimationBuilder,
} from "../engine/graphics/AnimationStateMachine";
import { AnimatedTile } from "../engine/resources/Tilemap";
import { AnimationLoader } from "@/engine/graphics/AnimationLoader";
import { Rigidbody } from "@/engine/physics/Rigidbody";
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
        const prevX = this.rigidbody.rect.position.x;
        const prevY = this.rigidbody.rect.position.y;

        // Move towards target when walking
        const dx = this.walkTarget.x - this.rigidbody.rect.position.x;
        const dy = this.walkTarget.y - this.rigidbody.rect.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Set max speed to 30 pixels per second
        this.rigidbody.setMaxSpeed(30);

        // Check if we're within 5% of the target distance (minimum 5 pixels)
        const targetThreshold = Math.max(5, distance * 0.05);

        if (distance > targetThreshold) {
          // Use moveTowards with desired speed for smooth movement
          this.rigidbody.moveTowards(this.walkTarget.x, this.walkTarget.y, 30);
        } else {
          // We're close enough - stop and clear target
          this.rigidbody.stop();
          this.walkTarget = null;
        }

        // Update rigidbody physics first
        this.rigidbody.update(deltaTime);

        // Check for collisions with static objects
        if (staticColliders && this.checkCollisionWith(staticColliders)) {
          // Revert position if collision detected
          this.rigidbody.setPosition(prevX, prevY);
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
      this.rigidbody.update(deltaTime);
    }

    // Boundary checking - keep cow babies within 200px of the island center
    const centerX = DESIGN_WIDTH / 2;
    const centerY = DESIGN_HEIGHT / 2;
    const deltaX = this.rigidbody.rect.position.x - centerX;
    const deltaY = this.rigidbody.rect.position.y - centerY;
    const centerDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    let boundsChanged = false;

    if (centerDistance > 200) {
      // Move cow back to 200px radius from the island center
      const scale = 200 / centerDistance;
      const constrainedX = centerX + deltaX * scale;
      const constrainedY = centerY + deltaY * scale;
      this.rigidbody.setPosition(constrainedX, constrainedY);
      boundsChanged = true;
    }

    // Also apply screen boundaries as secondary constraint (fallback)
    const padding = 50;

    if (this.rigidbody.rect.position.x < padding) {
      this.rigidbody.setPosition(padding, this.rigidbody.rect.position.y);
      boundsChanged = true;
    } else if (this.rigidbody.rect.position.x > 1920 - padding) {
      this.rigidbody.setPosition(1920 - padding, this.rigidbody.rect.position.y);
      boundsChanged = true;
    }

    if (this.rigidbody.rect.position.y < padding) {
      this.rigidbody.setPosition(this.rigidbody.rect.position.x, padding);
      boundsChanged = true;
    } else if (this.rigidbody.rect.position.y > 1080 - padding) {
      this.rigidbody.setPosition(this.rigidbody.rect.position.x, 1080 - padding);
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
      sprite.position.set(this.rigidbody.rect.position.x, this.rigidbody.rect.position.y);
    }
  }

  public startWalking(): void {
    // Set random target position within 50-150px but constrain to 200px radius from center (0, 0)
    const currentX = this.rigidbody.rect.position.x;
    const currentY = this.rigidbody.rect.position.y;

    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 100 + 50; // 50-150 pixels

    let targetX = currentX + Math.cos(angle) * distance;
    let targetY = currentY + Math.sin(angle) * distance;

    // Constrain target to 200px radius from center (0, 0)
    const centerDistance = Math.sqrt(targetX * targetX + targetY * targetY);
    if (centerDistance > 200) {
      const scale = 200 / centerDistance;
      targetX *= scale;
      targetY *= scale;
    }

    // Also constrain to screen boundaries (with padding) as fallback
    const padding = 50;
    targetX = Math.max(padding, Math.min(1920 - padding, targetX));
    targetY = Math.max(padding, Math.min(1080 - padding, targetY));

    this.walkTarget = {
      x: targetX,
      y: targetY,
    };
  }

  public getCollider(): RectangleCollider {
    return createRectangleCollider(
      this.rigidbody.rect.position.x,
      this.rigidbody.rect.position.y,
      this.rigidbody.rect.area.width,
      this.rigidbody.rect.area.height
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
 */
export class CowIdleAnimationState extends AnimationState {
  public idleTransitions = [
    "idle_blink",
    "walk",
    "hop",
    "stand",
    "sit",
    "sniff_ground",
    "eat_grass_idle",
    "idle_heart",
  ];

  constructor(animatedTile: AnimatedTile) {
    super("idle", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Random wait time between 2-4 seconds
    this.waitTime = Math.floor(Math.random() * 2000) + 2000;
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter > this.waitTime) {
      // Randomly transition to an action state
      const randomState =
        this.idleTransitions[Math.floor(Math.random() * this.idleTransitions.length)];
      return randomState;
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Idle blink animation state
 */
export class CowIdleBlinkAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("idle_blink", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Calculate animation length (2 frames)
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
 */
export class CowWalkAnimationState extends AnimationState {
  private targetPosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor(animatedTile: AnimatedTile) {
    super("walk", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Set walk duration between 1-3 seconds
    this.waitTime = Math.floor(Math.random() * 2000) + 1000;
    this.counter = 0;

    // Note: Movement will be handled by the CowBaby class that manages this state machine
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
 */
export class CowHopAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("hop", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Calculate animation length (3 frames)
    this.waitTime = 3 * this.animatedTile.frameDuration;
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
 */
export class CowStandAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("stand", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Hold stand pose for 2-4 seconds
    this.waitTime = Math.floor(Math.random() * 2000) + 2000;
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
 */
export class CowSitAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("sit", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Sit for 3-5 seconds
    this.waitTime = Math.floor(Math.random() * 2000) + 3000;
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
 */
export class CowSniffGroundAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("sniff_ground", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Calculate animation length (8 frames)
    this.waitTime = 8 * this.animatedTile.frameDuration;
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
 */
export class CowIdleHeartAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("idle_heart", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Calculate animation length (11 frames)
    this.waitTime = 11 * this.animatedTile.frameDuration;
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000;

    if (this.counter >= this.waitTime) {
      // Can only exit to idle
      return "idle";
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Fall asleep animation state
 */
export class CowFallAsleepAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("fall_asleep", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Calculate animation length (2 frames)
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
 * Generate the Cow Baby State Machine
 */
export async function buildCowBabyStateMachine(
  pixiApp: PIXI.Application,
  animationLoader: AnimationLoader
): Promise<CharacterAnimation> {
  // Load the animations first
  await animationLoader.load("/entities/cow_baby.png", "/entities/cow_baby.json", 150); // 150ms per frame

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

  // Use the builder with proper state classes
  const builder = new CharacterAnimationBuilder(sprite);

  if (idleFrames)
    builder.addState("idle", CowIdleAnimationState, idleFrames.frames as AnimationFrameData[], 150);
  if (idleBlinkFrames)
    builder.addState(
      "idle_blink",
      CowIdleBlinkAnimationState,
      idleBlinkFrames.frames as AnimationFrameData[],
      150
    );
  if (walkFrames)
    builder.addState("walk", CowWalkAnimationState, walkFrames.frames as AnimationFrameData[], 150);
  if (hopFrames)
    builder.addState("hop", CowHopAnimationState, hopFrames.frames as AnimationFrameData[], 150);
  if (standFrames)
    builder.addState(
      "stand",
      CowStandAnimationState,
      standFrames.frames as AnimationFrameData[],
      150
    );
  if (sitFrames)
    builder.addState("sit", CowSitAnimationState, sitFrames.frames as AnimationFrameData[], 150);
  if (fallAsleepFrames)
    builder.addState(
      "fall_asleep",
      CowFallAsleepAnimationState,
      fallAsleepFrames.frames as AnimationFrameData[],
      150
    );
  if (sniffGroundFrames)
    builder.addState(
      "sniff_ground",
      CowSniffGroundAnimationState,
      sniffGroundFrames.frames as AnimationFrameData[],
      150
    );
  if (eatGrassIdleFrames)
    builder.addState(
      "eat_grass_idle",
      CowEatGrassIdleAnimationState,
      eatGrassIdleFrames.frames as AnimationFrameData[],
      150
    );
  if (idleHeartFrames)
    builder.addState(
      "idle_heart",
      CowIdleHeartAnimationState,
      idleHeartFrames.frames as AnimationFrameData[],
      150
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
  const rigidbody = new Rigidbody(sprite, {
    position: { x, y },
    area: { width: 32 * 3, height: 32 * 3 }, // Based on cow_baby frame size
    velocity: { x: 0, y: 0 },
  });

  // Set up sprite properties
  sprite.anchor.set(0.5);
  sprite.scale.set(3);
  sprite.position.set(x, y);
  worldContainer.addChild(sprite);

  return new CowBaby(rigidbody, characterAnimation);
}

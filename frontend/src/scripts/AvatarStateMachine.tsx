import {
  AnimationState,
  CharacterAnimation,
  CharacterAnimationBuilder,
} from "../engine/graphics/AnimationStateMachine";
import { AnimatedTile } from "../engine/resources/Tilemap";
import { AnimationLoader } from "@/engine/graphics/AnimationLoader";
import { onSignal } from "@/engine/scripts/GlobalSignalHandler";
import * as PIXI from "pixi.js";

// Local interface for animation frame data to match CharacterAnimation expectations
interface AnimationFrameData {
  frameIndex?: number;
  texture?: PIXI.Texture;
  [key: string]: unknown;
}

/**
 * Idle animation state
 */
export class IdleAnimationState extends AnimationState {
  public idleTransitions = ["idle_emote_1", "idle_emote_2", "idle_emote_3"];
  private signalUnsubscribes: (() => void)[] = [];

  constructor(animatedTile: AnimatedTile) {
    super("idle", animatedTile);
  }

  onEnter(): void {
    // Reset animation to beginning
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Random wait time between 1-3 seconds (1000-3000ms)
    this.waitTime = Math.floor(Math.random() * 2000) + 1000;
    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000; // Convert to milliseconds

    if (this.counter > this.waitTime) {
      // Randomly transition to an emote state
      const randomState =
        this.idleTransitions[Math.floor(Math.random() * this.idleTransitions.length)];
      return randomState;
    }

    return null;
  }

  onExit(): void {}
}

/**
 * Idle Emote 1 animation state
 */
export class IdleEmote1AnimationState extends AnimationState {
  private targetRepetitions: number = 0;
  private currentRepetitions: number = 0;
  private animationLength: number = 0;

  constructor(animatedTile: AnimatedTile) {
    super("idle_emote_1", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Randomly pick 1-3 repetitions
    this.targetRepetitions = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    this.currentRepetitions = 0;

    // Calculate animation length (number of frames * frame duration)
    this.animationLength =
      this.animatedTile.animationFrames.length * this.animatedTile.frameDuration;

    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000; // Convert to milliseconds

    // Check if one full animation cycle completed
    if (this.counter >= this.animationLength) {
      this.currentRepetitions++;

      if (this.currentRepetitions >= this.targetRepetitions) {
        // Finished all repetitions, return to idle
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
 * Idle Emote 2 animation state
 */
export class IdleEmote2AnimationState extends AnimationState {
  private targetRepetitions: number = 0;
  private currentRepetitions: number = 0;
  private animationLength: number = 0;

  constructor(animatedTile: AnimatedTile) {
    super("idle_emote_2", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Randomly pick 1-3 repetitions
    this.targetRepetitions = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    this.currentRepetitions = 0;

    // Calculate animation length (number of frames * frame duration)
    this.animationLength =
      this.animatedTile.animationFrames.length * this.animatedTile.frameDuration;

    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000; // Convert to milliseconds

    // Check if one full animation cycle completed
    if (this.counter >= this.animationLength) {
      this.currentRepetitions++;

      if (this.currentRepetitions >= this.targetRepetitions) {
        // Finished all repetitions, return to idle
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
 * Idle Emote 3 animation state
 */
export class IdleEmote3AnimationState extends AnimationState {
  private targetRepetitions: number = 0;
  private currentRepetitions: number = 0;
  private animationLength: number = 0;

  constructor(animatedTile: AnimatedTile) {
    super("idle_emote_3", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();

    // Randomly pick 1-3 repetitions
    this.targetRepetitions = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    this.currentRepetitions = 0;

    // Calculate animation length (number of frames * frame duration)
    this.animationLength =
      this.animatedTile.animationFrames.length * this.animatedTile.frameDuration;

    this.counter = 0;
  }

  onUpdate(deltaTime: number): string | null {
    this.counter += deltaTime * 1000; // Convert to milliseconds

    // Check if one full animation cycle completed
    if (this.counter >= this.animationLength) {
      this.currentRepetitions++;

      if (this.currentRepetitions >= this.targetRepetitions) {
        // Finished all repetitions, return to idle
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
 * Heart Activate animation state
 */
export class HeartActivateAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("heart_activate", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  onExit(): void {}
}

/**
 * Heart Idle animation state
 */
export class HeartIdleAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("heart_idle", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  onExit(): void {}
}

/**
 * Heart Idle Emote 1 animation state
 */
export class HeartIdleEmote1AnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("heart_idle_emote_1", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  onExit(): void {}
}

/**
 * Heart Deactivate to UWU animation state
 */
export class HeartDeactivateToUWUAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("heart_deactivate_to_UWU", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  onExit(): void {}
}

/**
 * UWU Idle animation state
 */
export class UWUIdleAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("UWU_idle", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  onExit(): void {}
}

/**
 * UWU Idle Emote 1 animation state
 */
export class UWUIdleEmote1AnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("UWU_idle_emote_1", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  onExit(): void {}
}

/**
 * UWU Idle Emote 2 animation state
 */
export class UWUIdleEmote2AnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("UWU_idle_emote_2", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  onExit(): void {}
}

/**
 * UWU Idle Emote 3 animation state
 */
export class UWUIdleEmote3AnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("UWU_idle_emote_3", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  onExit(): void {}
}

/**
 * Cheer Activate animation state
 */
export class CheerActivateAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("cheer_activate", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  onExit(): void {}
}

/**
 * CheerIdle animation state that loops the cheer_idle animation forever
 */
export class CheerIdleAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("cheer_idle", animatedTile);
  }

  onEnter(): void {
    // Reset animation to beginning
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    // The AnimatedTile will handle automatic frame progression
    // This state just loops forever - no transitions
    return null;
  }

  onAnimationLoop(): void {
    // Exit on finish -- check if previous state was NOT cheer_activate
    if (this.parent && this.parent.getPreviousStateId() !== "cheer_activate") {
      this.parent.transitionTo("cheer_deactivate");
    }
  }

  onExit(): void {}
}

/**
 * Cheer Idle 2 animation state
 */
export class CheerIdle2AnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("cheer_idle_2", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  onExit(): void {}
}

/**
 * Cheer Deactivate animation state
 */
export class CheerDeactivateAnimationState extends AnimationState {
  constructor(animatedTile: AnimatedTile) {
    super("cheer_deactivate", animatedTile);
  }

  onEnter(): void {
    this.animatedTile.currentFrame = 0;
    this.animatedTile.lastFrameTime = Date.now();
  }

  onUpdate(_deltaTime: number): string | null {
    return null;
  }

  public onAnimationLoop(): void {
    if (this.parent) {
      this.parent.transitionTo("idle");
    }
  }

  onExit(): void {}
}

/**
 * Generate the Avatar State Machine using the new utility functions
 */
export async function buildAvatarStateMachine(
  pixiApp: PIXI.Application,
  animationLoader: AnimationLoader
): Promise<CharacterAnimation> {
  // Load the animations first
  await animationLoader.load("/effects/emoticons.png", "/effects/emoticons.json", 150); // 150ms per frame

  // Create a sprite for the character animation
  const sprite = new PIXI.Sprite();

  // Get animation frame data
  const idleFrames = animationLoader.getAnimation("idle");
  const idleEmote1Frames = animationLoader.getAnimation("idle_emote_1");
  const idleEmote2Frames = animationLoader.getAnimation("idle_emote_2");
  const idleEmote3Frames = animationLoader.getAnimation("idle_emote_3");
  const heartActivateFrames = animationLoader.getAnimation("heart_activate");
  const heartIdleFrames = animationLoader.getAnimation("heart_idle");
  const heartIdleEmote1Frames = animationLoader.getAnimation("heart_idle_emote_1");
  const heartDeactivateToUWUFrames = animationLoader.getAnimation("heart_deactivate_to_UWU");
  const UWUIdleFrames = animationLoader.getAnimation("UWU_idle");
  const UWUIdleEmote1Frames = animationLoader.getAnimation("UWU_idle_emote_1");
  const UWUIdleEmote2Frames = animationLoader.getAnimation("UWU_idle_emote_2");
  const UWUIdleEmote3Frames = animationLoader.getAnimation("UWU_idle_emote_3");
  const cheerActivateFrames = animationLoader.getAnimation("cheer_activate");
  const cheerIdleFrames = animationLoader.getAnimation("cheer_idle");
  const cheerIdleFrames2 = animationLoader.getAnimation("cheer_idle_2");
  const cheerDeactivateFrames = animationLoader.getAnimation("cheer_deactivate");

  // Use the builder with proper state classes
  const builder = new CharacterAnimationBuilder(sprite);
  if (idleFrames)
    builder.addState("idle", IdleAnimationState, idleFrames.frames as AnimationFrameData[], 150);
  if (idleEmote1Frames)
    builder.addState(
      "idle_emote_1",
      IdleEmote1AnimationState,
      idleEmote1Frames.frames as AnimationFrameData[],
      150
    );
  if (idleEmote2Frames)
    builder.addState(
      "idle_emote_2",
      IdleEmote2AnimationState,
      idleEmote2Frames.frames as AnimationFrameData[],
      150
    );
  if (idleEmote3Frames)
    builder.addState(
      "idle_emote_3",
      IdleEmote3AnimationState,
      idleEmote3Frames.frames as AnimationFrameData[],
      150
    );
  if (cheerIdleFrames2)
    builder.addState(
      "cheer_idle_2",
      CheerIdle2AnimationState,
      cheerIdleFrames2.frames as AnimationFrameData[],
      150
    );
  if (heartActivateFrames)
    builder.addState(
      "heart_activate",
      HeartActivateAnimationState,
      heartActivateFrames.frames as AnimationFrameData[],
      150
    );
  if (heartIdleFrames)
    builder.addState(
      "heart_idle",
      HeartIdleAnimationState,
      heartIdleFrames.frames as AnimationFrameData[],
      150
    );
  if (heartIdleEmote1Frames)
    builder.addState(
      "heart_idle_emote_1",
      HeartIdleEmote1AnimationState,
      heartIdleEmote1Frames.frames as AnimationFrameData[],
      150
    );
  if (heartDeactivateToUWUFrames)
    builder.addState(
      "heart_deactivate_to_UWU",
      HeartDeactivateToUWUAnimationState,
      heartDeactivateToUWUFrames.frames as AnimationFrameData[],
      150
    );
  if (UWUIdleFrames)
    builder.addState(
      "UWU_idle",
      UWUIdleAnimationState,
      UWUIdleFrames.frames as AnimationFrameData[],
      150
    );
  if (UWUIdleEmote1Frames)
    builder.addState(
      "UWU_idle_emote_1",
      UWUIdleEmote1AnimationState,
      UWUIdleEmote1Frames.frames as AnimationFrameData[],
      150
    );
  if (UWUIdleEmote2Frames)
    builder.addState(
      "UWU_idle_emote_2",
      UWUIdleEmote2AnimationState,
      UWUIdleEmote2Frames.frames as AnimationFrameData[],
      150
    );
  if (UWUIdleEmote3Frames)
    builder.addState(
      "UWU_idle_emote_3",
      UWUIdleEmote3AnimationState,
      UWUIdleEmote3Frames.frames as AnimationFrameData[],
      150
    );
  if (cheerActivateFrames)
    builder.addState(
      "cheer_activate",
      CheerActivateAnimationState,
      cheerActivateFrames.frames as AnimationFrameData[],
      150
    );
  if (cheerIdleFrames)
    builder.addState(
      "cheer_idle",
      CheerIdleAnimationState,
      cheerIdleFrames.frames as AnimationFrameData[],
      150
    );
  if (cheerIdleFrames2)
    builder.addState(
      "cheer_idle_2",
      CheerIdle2AnimationState,
      cheerIdleFrames2.frames as AnimationFrameData[],
      150
    );
  if (cheerDeactivateFrames)
    builder.addState(
      "cheer_deactivate",
      CheerDeactivateAnimationState,
      cheerDeactivateFrames.frames as AnimationFrameData[],
      150
    );

  // Build and set initial state
  const characterAnimation = builder.build("idle");

  // Subscribe to global transition signals
  onSignal("avatar.transition", (data?: { to: string }) => {
    if (data && characterAnimation.hasState(data.to)) {
      characterAnimation.setState(data.to);
    }
  });

  return characterAnimation;
}

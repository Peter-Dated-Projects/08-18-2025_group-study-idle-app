import * as PIXI from "pixi.js";

interface AnimationFrame {
  frameIndex: number;
  texture: PIXI.Texture;
}

interface AnimationDefinition {
  name: string;
  frames: number[];
}

interface SpriteSheetAnimation {
  name: string;
  frames: AnimationFrame[];
  duration: number; // Total duration in milliseconds
  frameDuration: number; // Duration per frame in milliseconds
}

interface SpriteSheetData {
  frame_width: number;
  frame_height: number;
  animations: AnimationDefinition[];
  info?: string;
}

export class AnimationLoader {
  private baseTexture: PIXI.Texture | null = null;
  private spriteSheetData: SpriteSheetData | null = null;
  private animations: Map<string, SpriteSheetAnimation> = new Map();

  /**
   * Load a spritesheet and its animation data
   * @param textureUrl - Path to the spritesheet image
   * @param dataUrl - Path to the animation data JSON
   * @param defaultFrameDuration - Default duration per frame in milliseconds
   */
  public async load(
    textureUrl: string,
    dataUrl: string,
    defaultFrameDuration: number = 150
  ): Promise<void> {
    try {
      // Load the spritesheet texture
      this.baseTexture = await PIXI.Assets.load(textureUrl);
      console.log("✅ Spritesheet texture loaded:", textureUrl);

      // Load the animation data
      const response = await fetch(dataUrl);
      this.spriteSheetData = await response.json();
      console.log("✅ Animation data loaded:", dataUrl);

      // Create animations from the data
      this.createAnimations(defaultFrameDuration);
      console.log(`✅ Created ${this.animations.size} animations`);
    } catch (error) {
      console.error("❌ Failed to load spritesheet:", error);
      throw error;
    }
  }

  /**
   * Create PIXI textures and animations from the loaded data
   */
  private createAnimations(defaultFrameDuration: number): void {
    if (!this.baseTexture || !this.spriteSheetData) {
      throw new Error("Spritesheet data not loaded");
    }

    const { frame_width, frame_height, animations } = this.spriteSheetData;
    const textureWidth = this.baseTexture.width;
    const framesPerRow = Math.floor(textureWidth / frame_width);

    // Create animations
    animations.forEach((animDef) => {
      const animationFrames: AnimationFrame[] = [];

      animDef.frames.forEach((frameIndex) => {
        // Calculate position in the spritesheet
        const row = Math.floor(frameIndex / framesPerRow);
        const col = frameIndex % framesPerRow;
        const x = col * frame_width;
        const y = row * frame_height;

        // Create texture from the base texture
        const frameTexture = new PIXI.Texture({
          source: this.baseTexture!.source,
          frame: new PIXI.Rectangle(x, y, frame_width, frame_height),
        });

        animationFrames.push({
          frameIndex,
          texture: frameTexture,
        });
      });

      const animation: SpriteSheetAnimation = {
        name: animDef.name,
        frames: animationFrames,
        frameDuration: defaultFrameDuration,
        duration: animationFrames.length * defaultFrameDuration,
      };

      this.animations.set(animDef.name, animation);
      console.log(`Created animation: ${animDef.name} (${animationFrames.length} frames)`);
    });
  }

  /**
   * Get an animation by name
   */
  public getAnimation(name: string): SpriteSheetAnimation | null {
    return this.animations.get(name) || null;
  }

  /**
   * Get all available animation names
   */
  public getAnimationNames(): string[] {
    return Array.from(this.animations.keys());
  }

  /**
   * Check if an animation exists
   */
  public hasAnimation(name: string): boolean {
    return this.animations.has(name);
  }

  /**
   * Get the current frame texture for an animation at a specific time
   * @param animationName - Name of the animation
   * @param currentTime - Current time in milliseconds
   * @param loop - Whether to loop the animation
   */
  public getCurrentFrame(
    animationName: string,
    currentTime: number,
    loop: boolean = true
  ): PIXI.Texture | null {
    const animation = this.getAnimation(animationName);
    if (!animation) return null;

    let timeInAnimation = currentTime % animation.duration;
    if (!loop && currentTime >= animation.duration) {
      // If not looping and past the end, return the last frame
      return animation.frames[animation.frames.length - 1].texture;
    }

    const frameIndex = Math.floor(timeInAnimation / animation.frameDuration);
    const clampedFrameIndex = Math.min(frameIndex, animation.frames.length - 1);

    return animation.frames[clampedFrameIndex].texture;
  }

  /**
   * Get the frame index for an animation at a specific time
   */
  public getCurrentFrameIndex(
    animationName: string,
    currentTime: number,
    loop: boolean = true
  ): number {
    const animation = this.getAnimation(animationName);
    if (!animation) return 0;

    let timeInAnimation = currentTime % animation.duration;
    if (!loop && currentTime >= animation.duration) {
      return animation.frames.length - 1;
    }

    const frameIndex = Math.floor(timeInAnimation / animation.frameDuration);
    return Math.min(frameIndex, animation.frames.length - 1);
  }

  /**
   * Create an animated sprite that automatically updates
   * @param animationName - Name of the animation to play
   * @param autoPlay - Whether to start playing immediately
   */
  public createAnimatedSprite(
    animationName: string,
    autoPlay: boolean = true
  ): AnimatedSpriteWrapper | null {
    const animation = this.getAnimation(animationName);
    if (!animation) return null;

    return new AnimatedSpriteWrapper(animation, autoPlay);
  }

  /**
   * Destroy the animation loader and free resources
   */
  public destroy(): void {
    this.animations.forEach((animation) => {
      animation.frames.forEach((frame) => {
        frame.texture.destroy();
      });
    });
    this.animations.clear();
    this.baseTexture = null;
    this.spriteSheetData = null;
  }
}

/**
 * Wrapper class for animated sprites that handles timing and frame updates
 */
export class AnimatedSpriteWrapper {
  private sprite: PIXI.Sprite;
  private animation: SpriteSheetAnimation;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private loop: boolean = true;
  private onComplete?: () => void;

  constructor(animation: SpriteSheetAnimation, autoPlay: boolean = true) {
    this.animation = animation;
    this.sprite = new PIXI.Sprite(animation.frames[0].texture);

    if (autoPlay) {
      this.play();
    }
  }

  /**
   * Start playing the animation
   */
  public play(loop: boolean = true): void {
    this.isPlaying = true;
    this.loop = loop;
    this.startTime = Date.now();
  }

  /**
   * Stop the animation
   */
  public stop(): void {
    this.isPlaying = false;
  }

  /**
   * Pause the animation
   */
  public pause(): void {
    this.isPlaying = false;
  }

  /**
   * Reset animation to first frame
   */
  public reset(): void {
    this.startTime = Date.now();
    this.sprite.texture = this.animation.frames[0].texture;
  }

  /**
   * Update the sprite (call this in your game loop)
   */
  public update(): void {
    if (!this.isPlaying) return;

    const currentTime = Date.now() - this.startTime;
    const frameIndex = this.getCurrentFrameIndex(currentTime);

    // Update sprite texture
    this.sprite.texture = this.animation.frames[frameIndex].texture;

    // Check if animation is complete (for non-looping animations)
    if (!this.loop && currentTime >= this.animation.duration) {
      this.isPlaying = false;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  /**
   * Get the current frame index
   */
  private getCurrentFrameIndex(currentTime: number): number {
    let timeInAnimation = currentTime % this.animation.duration;
    if (!this.loop && currentTime >= this.animation.duration) {
      return this.animation.frames.length - 1;
    }

    const frameIndex = Math.floor(timeInAnimation / this.animation.frameDuration);
    return Math.min(frameIndex, this.animation.frames.length - 1);
  }

  /**
   * Set a callback for when the animation completes (non-looping only)
   */
  public onAnimationComplete(callback: () => void): void {
    this.onComplete = callback;
  }

  /**
   * Get the PIXI sprite
   */
  public getSprite(): PIXI.Sprite {
    return this.sprite;
  }

  /**
   * Check if the animation is currently playing
   */
  public isAnimationPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Destroy the animated sprite
   */
  public destroy(): void {
    this.sprite.destroy();
    this.onComplete = undefined;
  }
}

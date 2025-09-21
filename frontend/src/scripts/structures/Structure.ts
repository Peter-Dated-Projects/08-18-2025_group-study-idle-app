import { PhysicsEntity, Vec2 } from "../../engine/physics";
import * as PIXI from "pixi.js";

/**
 * Structure entity - clickable world editing structure
 * Extends PhysicsEntity to provide interactive building/editing functionality
 */
export class Structure extends PhysicsEntity {
  protected sprite: PIXI.Sprite | null = null;
  protected onClick: ((structure: Structure) => void) | null = null;
  protected isClickable: boolean = true;

  constructor(position: Vec2, onClick?: (structure: Structure) => void) {
    // Create the base physics entity with 256x256 size
    super(
      position,
      new Vec2(256, 256),
      `structure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );

    // Set up as static entity (doesn't move)
    this.isStatic = true;
    this.mass = Infinity;

    // Add appropriate tags
    this.addTag("structure");
    this.addTag("clickable");
    this.addTag("building");

    // Store onClick callback
    this.onClick = onClick || null;

    // Set up physics properties
    this.friction = 1.0; // No sliding
    this.restitution = 0.0; // No bouncing
  }

  /**
   * Initialize the sprite component with the empty structure texture
   */
  public async initializeSprite(): Promise<void> {
    try {
      // Load the empty structure texture
      const texture = await PIXI.Assets.load("/entities/empty-structure.png");

      // Create sprite
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit 100x100 size
      const scaleX = 256 / texture.width;
      const scaleY = 256 / texture.height;
      this.sprite.scale.set(scaleX, scaleY);

      // Position sprite
      this.sprite.position.set(this.position.x, this.position.y);

      // Enable interactivity
      this.sprite.interactive = true;
      this.sprite.cursor = "pointer";

      // Set up click event
      this.sprite.on("pointerdown", this.handleClick.bind(this));

      // Set pixel-perfect rendering
      texture.source.scaleMode = "nearest";

      console.log(
        `Structure sprite initialized at position (${this.position.x}, ${this.position.y})`
      );
    } catch (error) {
      console.error("Failed to initialize Structure sprite:", error);
    }
  }

  /**
   * Handle click events - protected so subclasses can override
   */
  protected handleClick(event: PIXI.FederatedPointerEvent): void {
    if (!this.isClickable) return;

    console.log("Structure clicked:", this);
    console.log("Structure details:", {
      id: this.id,
      position: { x: this.position.x, y: this.position.y },
      size: this.collider?.size || { x: 100, y: 100 },
      tags: Array.from(this.tags),
      isStatic: this.isStatic,
    });

    // Call the onClick callback if provided
    if (this.onClick) {
      this.onClick(this);
    }
  }

  /**
   * Get the sprite component for adding to containers
   */
  public getSprite(): PIXI.Sprite | null {
    return this.sprite;
  }

  /**
   * Set the onClick callback
   */
  public setOnClick(callback: (structure: Structure) => void): void {
    this.onClick = callback;
  }

  /**
   * Enable/disable click interaction
   */
  public setClickable(clickable: boolean): void {
    this.isClickable = clickable;
    if (this.sprite) {
      this.sprite.interactive = clickable;
      this.sprite.cursor = clickable ? "pointer" : "default";
    }
  }

  /**
   * Update sprite position to match physics position
   */
  public updateSpritePosition(): void {
    if (this.sprite) {
      this.sprite.position.set(this.position.x, this.position.y);
    }
  }

  /**
   * Cleanup when destroying the structure
   */
  public destroy(): void {
    if (this.sprite) {
      this.sprite.removeAllListeners();
      this.sprite.destroy();
      this.sprite = null;
    }
  }

  /**
   * Static factory method to create a Structure with automatic sprite initialization
   */
  public static async create(
    position: Vec2,
    onClick?: (structure: Structure) => void
  ): Promise<Structure> {
    const structure = new Structure(position, onClick);
    await structure.initializeSprite();
    return structure;
  }
}

export default Structure;

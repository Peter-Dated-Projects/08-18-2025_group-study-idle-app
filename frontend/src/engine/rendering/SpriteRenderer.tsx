import * as PIXI from "pixi.js";
import { BaseRenderer } from "./BaseRenderer";
import { PhysicsEntity } from "../physics";

/**
 * Component that holds sprite information for rendering
 */
export interface SpriteComponent {
  sprite: PIXI.Sprite | PIXI.Container;
  texture?: PIXI.Texture;
  tint?: number;
  alpha?: number;
  visible?: boolean;
  scale?: { x: number; y: number };
  anchor?: { x: number; y: number };
}

/**
 * Concrete renderer for sprite-based entities
 * Manages SpriteComponent and debug rendering objects, handles PIXI visibility
 */
export class SpriteRenderer extends BaseRenderer {
  private spriteComponent: SpriteComponent | null = null;
  private debugGraphics: PIXI.Graphics | null = null;
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor(spriteComponent?: SpriteComponent) {
    super();
    if (spriteComponent) {
      this.spriteComponent = spriteComponent;
    }
  }

  /**
   * Set the sprite component for this renderer
   */
  setSpriteComponent(spriteComponent: SpriteComponent): void {
    // Remove old sprite from container if it exists
    if (this.spriteComponent && this.getWorldContainer()) {
      this.getWorldContainer()!.removeChild(this.spriteComponent.sprite);
    }

    this.spriteComponent = spriteComponent;

    // Add new sprite to container if initialized
    if (this.getWorldContainer() && this.spriteComponent) {
      this.getWorldContainer()!.addChild(this.spriteComponent.sprite);
    }
  }

  /**
   * Get the current sprite component
   */
  getSpriteComponent(): SpriteComponent | null {
    return this.spriteComponent;
  }

  /**
   * Create a debug sprite component for entities without custom sprites (red rectangle)
   */
  createDebugSpriteComponent(entity: PhysicsEntity): SpriteComponent {
    const graphics = new PIXI.Graphics();

    // Get entity size from collider or use default
    const size = entity.collider?.size || { x: 32, y: 32 };

    // Create red outline rectangle like in the current GardenCanvas
    graphics.rect(-size.x / 2, -size.y / 2, size.x, size.y);
    graphics.stroke({ color: 0xff0000, width: 2 });

    // Set zIndex based on entity tags
    const zIndex = entity.hasTag && entity.hasTag("ground") ? -50 : 0;
    graphics.zIndex = zIndex;

    return {
      sprite: graphics,
      visible: true,
      alpha: 1.0,
      scale: { x: 1, y: 1 },
      anchor: { x: 0.5, y: 0.5 },
    };
  }

  /**
   * Create a sprite component from an existing PIXI sprite (for Structure entities)
   */
  createSpriteFromExisting(existingSprite: PIXI.Sprite | PIXI.Container): SpriteComponent {
    return {
      sprite: existingSprite,
      visible: existingSprite.visible,
      alpha: existingSprite.alpha,
      scale: { x: existingSprite.scale.x, y: existingSprite.scale.y },
      anchor: { x: 0.5, y: 0.5 }, // Assume center anchor for existing sprites
    };
  }

  /**
   * Create a sprite component from a custom sprite path
   */
  async createSpriteFromPath(
    entity: PhysicsEntity,
    spritePath: string
  ): Promise<SpriteComponent | null> {
    try {
      const texture = await PIXI.Assets.load(spritePath);
      const sprite = new PIXI.Sprite(texture);

      sprite.anchor.set(0.5);

      // Apply custom scaling if specified
      const scale = (entity as any).spriteScale || { x: 1, y: 1 };
      sprite.scale.set(scale.x, scale.y);

      // Set zIndex based on entity tags
      const zIndex = entity.hasTag && entity.hasTag("decoration") ? -10 : 0;
      sprite.zIndex = zIndex;

      // Set pixel-perfect rendering
      texture.source.scaleMode = "nearest";

      return {
        sprite: sprite,
        texture: texture,
        visible: true,
        alpha: 1.0,
        scale: scale,
        anchor: { x: 0.5, y: 0.5 },
      };
    } catch (error) {
      console.warn(`Failed to load sprite for entity ${entity.id}:`, error);
      return null;
    }
  }

  /**
   * Create a basic sprite component for entities without custom sprites
   */
  createDefaultSpriteComponent(entity: PhysicsEntity): SpriteComponent {
    const graphics = new PIXI.Graphics();

    // Get entity size from collider or use default
    const size = entity.collider?.size || { x: 32, y: 32 };

    // Draw a colored rectangle based on entity properties
    const color = entity.tint || 0xffffff;
    graphics.fill(color);
    graphics.rect(0, 0, size.x, size.y);
    graphics.fill();

    // Set anchor to center
    graphics.pivot.set(size.x / 2, size.y / 2);

    return {
      sprite: graphics,
      tint: color,
      visible: true,
      alpha: 1.0,
      scale: { x: 1, y: 1 },
      anchor: { x: 0.5, y: 0.5 },
    };
  }

  /**
   * Initialize the renderer
   */
  protected onInitialize(): void {
    // Add sprite to world container if we have one
    if (this.spriteComponent && this.getWorldContainer()) {
      this.getWorldContainer()!.addChild(this.spriteComponent.sprite);
    }

    // Create debug graphics
    this.createDebugGraphics();
  }

  /**
   * Create debug graphics for entity bounds visualization
   */
  private createDebugGraphics(): void {
    this.debugGraphics = new PIXI.Graphics();
    this.debugGraphics.visible = this.debugMode;

    if (this.getWorldContainer()) {
      this.getWorldContainer()!.addChild(this.debugGraphics);
    }
  }

  /**
   * Main rendering implementation
   */
  protected onRender(entity: PhysicsEntity): void {
    // Create appropriate sprite if none exists
    if (!this.spriteComponent) {
      // First check if this is a Structure entity with its own sprite
      if (entity.hasTag && entity.hasTag("structure") && (entity as any).getSprite) {
        const structureSprite = (entity as any).getSprite();
        if (structureSprite) {
          this.setSpriteComponent(this.createSpriteFromExisting(structureSprite));
          return; // Structure handles its own rendering
        }
      }

      // Set default sprite path for structure entities without one
      if (entity.hasTag && entity.hasTag("structure") && !(entity as any).spritePath) {
        (entity as any).spritePath = "/sprites/structure.png";
      }

      // Try to create from custom sprite path if entity has one
      if ((entity as any).spritePath) {
        // For structures and baby cows, don't show debug sprite as fallback - they have their own sprites
        if (!entity.hasTag || (!entity.hasTag("structure") && !entity.hasTag("baby_cow"))) {
          this.setSpriteComponent(this.createDebugSpriteComponent(entity));
        }

        // Async load the actual sprite
        this.createSpriteFromPath(entity, (entity as any).spritePath).then((spriteComponent) => {
          if (spriteComponent) {
            this.setSpriteComponent(spriteComponent);
          }
        });
      } else {
        // Use debug red rectangle for entities without custom sprites, but not for structures or baby cows
        if (!entity.hasTag || (!entity.hasTag("structure") && !entity.hasTag("baby_cow"))) {
          this.setSpriteComponent(this.createDebugSpriteComponent(entity));
        }
      }
    }

    if (!this.spriteComponent) return;

    // Update sprite position
    this.spriteComponent.sprite.x = entity.position.x;
    this.spriteComponent.sprite.y = entity.position.y;

    // Update sprite rotation if entity has rotation
    if ("rotation" in entity) {
      this.spriteComponent.sprite.rotation = (entity as any).rotation || 0;
    }

    // Update sprite properties from component
    if (this.spriteComponent.tint !== undefined) {
      this.spriteComponent.sprite.tint = this.spriteComponent.tint;
    }
    if (this.spriteComponent.alpha !== undefined) {
      this.spriteComponent.sprite.alpha = this.spriteComponent.alpha;
    }
    if (this.spriteComponent.visible !== undefined) {
      this.spriteComponent.sprite.visible = this.spriteComponent.visible;
    }
    if (this.spriteComponent.scale) {
      this.spriteComponent.sprite.scale.set(
        this.spriteComponent.scale.x,
        this.spriteComponent.scale.y
      );
    }

    // Update debug rendering if enabled
    if (this.debugMode) {
      this.updateDebugGraphics(entity);
    }

    // Store last position for delta calculations
    this.lastPosition.x = entity.position.x;
    this.lastPosition.y = entity.position.y;
  }

  /**
   * Update debug graphics to show entity bounds
   */
  private updateDebugGraphics(entity: PhysicsEntity): void {
    if (!this.debugGraphics || !this.debugMode) return;

    // Skip debug graphics for structures
    if (entity.hasTag && entity.hasTag("structure")) return;

    this.debugGraphics.clear();

    // Get entity size from collider or use default
    const size = entity.collider?.size || { x: 32, y: 32 };

    // Draw entity bounds as red outline
    this.debugGraphics.stroke({ width: 2, color: 0xff0000 });
    this.debugGraphics.rect(
      entity.position.x - size.x / 2,
      entity.position.y - size.y / 2,
      size.x,
      size.y
    );
    this.debugGraphics.stroke();

    // Draw velocity vector if entity is moving
    if ("velocity" in entity) {
      const velocity = (entity as any).velocity;
      if (velocity && (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1)) {
        this.debugGraphics.stroke({ width: 1, color: 0x00ff00 });
        this.debugGraphics.moveTo(entity.position.x, entity.position.y);
        this.debugGraphics.lineTo(
          entity.position.x + velocity.x * 10,
          entity.position.y + velocity.y * 10
        );
        this.debugGraphics.stroke();
      }
    }
  }

  /**
   * Handle debug mode changes
   */
  protected onDebugModeChanged(enabled: boolean): void {
    if (this.debugGraphics) {
      this.debugGraphics.visible = enabled;
    }
  }

  /**
   * Update method for frame-based logic
   */
  protected onUpdate(deltaTime: number): void {
    // Can be overridden for animation or other frame-based updates
  }

  /**
   * Clean up resources
   */
  protected onDestroy(): void {
    // Remove sprite from container
    if (this.spriteComponent && this.getWorldContainer()) {
      this.getWorldContainer()!.removeChild(this.spriteComponent.sprite);
    }

    // Remove debug graphics
    if (this.debugGraphics && this.getWorldContainer()) {
      this.getWorldContainer()!.removeChild(this.debugGraphics);
      this.debugGraphics.destroy();
    }

    // Destroy sprite if it's a graphics object we created
    if (this.spriteComponent && this.spriteComponent.sprite instanceof PIXI.Graphics) {
      this.spriteComponent.sprite.destroy();
    }

    this.spriteComponent = null;
    this.debugGraphics = null;
  }

  /**
   * Set sprite visibility
   */
  setVisible(visible: boolean): void {
    if (this.spriteComponent) {
      this.spriteComponent.visible = visible;
      this.spriteComponent.sprite.visible = visible;
    }
  }

  /**
   * Set sprite tint
   */
  setTint(tint: number): void {
    if (this.spriteComponent) {
      this.spriteComponent.tint = tint;
      this.spriteComponent.sprite.tint = tint;
    }
  }

  /**
   * Set sprite alpha
   */
  setAlpha(alpha: number): void {
    if (this.spriteComponent) {
      this.spriteComponent.alpha = alpha;
      this.spriteComponent.sprite.alpha = alpha;
    }
  }
}

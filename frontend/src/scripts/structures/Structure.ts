import { PhysicsEntity, Vec2 } from "../../engine/physics";
import * as PIXI from "pixi.js";
import { OutlineFilter } from "pixi-filters";
import { Entity } from "@/engine/physics/Entity";

import { EMPTY_STRUCTURE_CONFIG } from "@/config/structureConfigs";
import { getMouseHandlerState, mouseHandler } from "@/engine/input/MouseHandler";

export interface MouseInteractionCallbacks {
  onClick?: (entity: Entity) => void;
  onEnter?: (entity: Entity) => void;
  onLeave?: (entity: Entity) => void;
}

export interface StructureState {
  isHovered: boolean;
}

/**
 * Structure entity - clickable world editing structure
 * Extends PhysicsEntity to provide interactive building/editing functionality
 */
export class Structure extends PhysicsEntity {
  protected sprite: PIXI.Sprite | null = null;
  protected isClickable: boolean = true;
  protected hoverBorder: PIXI.Graphics | null = null;
  protected mouseCallbacks: MouseInteractionCallbacks;
  protected state: StructureState = {
    isHovered: false,
  };

  constructor(position: Vec2, mouseCallbacks: MouseInteractionCallbacks) {
    // Create the base physics entity with 128x128 size (reduced from 256x256)
    super(
      position,
      new Vec2(128, 128),
      `structure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );

    // Set up as static entity (doesn't move)
    this.isStatic = true;
    this.mass = Infinity;

    // Add appropriate tags
    this.addTag("structure");
    this.addTag("clickable");
    this.addTag("building");

    // Store callbacks
    this.mouseCallbacks = mouseCallbacks;

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
      const texture = await PIXI.Assets.load(EMPTY_STRUCTURE_CONFIG.image);

      // Create sprite
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit desired size
      const scaleX = EMPTY_STRUCTURE_CONFIG.width / texture.width;
      const scaleY = EMPTY_STRUCTURE_CONFIG.height / texture.height;
      this.sprite.scale.set(scaleX, scaleY);

      // Position sprite
      this.sprite.position.set(this.position.x, this.position.y);

      // Set initial z-index based on bottom of structure
      const halfHeight = EMPTY_STRUCTURE_CONFIG.height / 2;
      const bottomY = this.position.y + halfHeight;
      this.sprite.zIndex = bottomY;

      // Enable interactivity
      this.sprite.interactive = true;
      this.sprite.cursor = "pointer";

      // Set up click event
      this.sprite.on("pointerdown", this.handleClick.bind(this));

      // Set up hover events for white border effect
      this.sprite.on("pointerover", this.handleHoverEnter.bind(this));
      this.sprite.on("pointerout", this.handleHoverExit.bind(this));

      // Set pixel-perfect rendering
      texture.source.scaleMode = "nearest";
    } catch (error) {
      console.error("Failed to initialize Structure sprite:", error);
    }
  }

  /**
   * Update function called each frame - can be overridden by subclasses
   */
  public update(): void {
    if (!mouseHandler?.isMouseInside()) return;

    const mousePosition = mouseHandler.getCurrentWorldPosition();
    const currentMousePos = new Vec2(mousePosition.x, mousePosition.y);
    const isWithinBounds = this.isPointInEntityBounds(currentMousePos, this);

    if (!isWithinBounds) {
      if (this.state.isHovered) {
        this.state.isHovered = false;
        this.handleHoverExit();
      }
      return;
    }

    if (!this.state.isHovered) {
      this.handleHoverEnter();
      this.state.isHovered = true;
    }

    if (mouseHandler.wasLeftButtonClicked()) {
      this.handleClick();
    }
  }

  /**
   * Check if point is inside entity bounds
   */
  public isPointInEntityBounds(point: Vec2, entity: PhysicsEntity): boolean {
    const entityPos = entity.position;
    const entitySize = entity.collider?.size || new Vec2(32, 32);

    // Calculate entity bounds (assuming center anchor)
    const halfWidth = entitySize.x / 2;
    const halfHeight = entitySize.y / 2;

    const left = entityPos.x - halfWidth;
    const right = entityPos.x + halfWidth;
    const top = entityPos.y - halfHeight;
    const bottom = entityPos.y + halfHeight;

    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  }

  /**
   * Handle click events - protected so subclasses can override
   */
  protected handleClick(): void {
    if (!this.isClickable) return;
    // call onClick if provided
    if (this.mouseCallbacks.onClick) {
      this.mouseCallbacks.onClick(this);
    }
  }

  /**
   * Handle hover enter - shows white border around the sprite
   */
  protected handleHoverEnter(): void {
    // if has callback
    if (this.mouseCallbacks.onEnter) {
      this.mouseCallbacks.onEnter(this);
    }

    // add a white border if not already present
    if (this.sprite! && !this.hoverBorder) {
      this.sprite.filters = [new OutlineFilter(4, 0xffffff) as any];
    }
  }

  /**
   * Handle hover exit - removes white border
   */
  protected handleHoverExit(): void {
    if (this.mouseCallbacks.onLeave) {
      this.mouseCallbacks.onLeave(this);
    }

    if (this.sprite! && this.hoverBorder) {
      this.sprite.filters = null;
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
  public setOnClick(callback: (entity: Entity) => void): void {
    this.mouseCallbacks.onClick = callback;
  }

  /**
   * Set the onHover callback
   */
  public setOnEnter(callback: (entity: Entity) => void): void {
    this.mouseCallbacks.onEnter = callback;
  }

  /**
   * Set the onClick callback
   */
  public setOnLeave(callback: (entity: Entity) => void): void {
    this.mouseCallbacks.onLeave = callback;
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
   * Update sprite position and z-index to match physics position
   * Uses bottom-based z-indexing as requested
   */
  public updateSpritePosition(): void {
    if (this.sprite) {
      this.sprite.position.set(this.position.x, this.position.y);

      // Set z-index based on the bottom of the structure (position.y + half height)
      const halfHeight = this.collider?.size.y || 128; // Default half height
      const bottomY = this.position.y + halfHeight / 2;
      this.sprite.zIndex = bottomY;
    }
  }

  /**
   * Cleanup when destroying the structure
   */
  public destroy(): void {
    // Clean up hover border first
    if (this.hoverBorder) {
      if (this.hoverBorder.parent) {
        this.hoverBorder.parent.removeChild(this.hoverBorder);
      }
      this.hoverBorder.destroy();
      this.hoverBorder = null;
    }

    // Clean up sprite
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
    mouseCallbacks: MouseInteractionCallbacks
  ): Promise<Structure> {
    const structure = new Structure(position, mouseCallbacks);
    await structure.initializeSprite();
    return structure;
  }
}

export default Structure;

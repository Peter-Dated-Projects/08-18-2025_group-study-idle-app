import { PhysicsEntity, Vec2 } from "../physics";
import { mouseHandler } from "../input/MouseHandler";

/**
 * Interface for mouse interaction callbacks
 */
export interface MouseInteractionCallbacks {
  onEnter?: (entity: PhysicsEntity) => void;
  onLeave?: (entity: PhysicsEntity) => void;
  onClick?: (entity: PhysicsEntity) => void;
  onHover?: (entity: PhysicsEntity) => void;
}

/**
 * MouseInteractionSystem handles frame-based mouse interaction detection
 * for PIXI entities that don't have native DOM event support
 */
export class MouseInteractionSystem {
  private entities: PhysicsEntity[] = [];
  private hoveredEntities: Set<string> = new Set();
  private lastMousePosition: Vec2 = new Vec2(0, 0);
  private isMouseDown: boolean = false;
  private wasMouseDownLastFrame: boolean = false;

  /**
   * Register an entity for mouse interaction detection
   */
  public registerEntity(entity: PhysicsEntity): void {
    if (!this.entities.includes(entity)) {
      this.entities.push(entity);
    }
  }

  /**
   * Unregister an entity from mouse interaction detection
   */
  public unregisterEntity(entity: PhysicsEntity): void {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
    }
    this.hoveredEntities.delete(entity.id);
  }

  /**
   * Update mouse interactions - should be called every frame
   */
  public update(): void {
    if (!mouseHandler) return;

    // Get current mouse world position
    const mouseWorldPos = mouseHandler.getCurrentWorldPosition();
    if (!mouseWorldPos) return;

    const currentMousePos = new Vec2(mouseWorldPos.x, mouseWorldPos.y);

    // Track which entities are currently under the mouse
    const currentlyHovered = new Set<string>();

    // Check each registered entity
    for (const entity of this.entities) {
      if (!entity.isActive || !entity.hasTag("clickable")) continue;

      // Check if mouse is within entity bounds
      const isWithinBounds = this.isPointInEntityBounds(currentMousePos, entity);

      if (isWithinBounds) {
        currentlyHovered.add(entity.id);

        // Check for onEnter event (mouse just entered)
        if (!this.hoveredEntities.has(entity.id)) {
          this.handleMouseEnter(entity);
        }

        // Check for onHover event (mouse is hovering)
        this.handleMouseHover(entity);

        // Check for onClick event (mouse was just pressed down)
        if (this.isMouseDown && !this.wasMouseDownLastFrame) {
          this.handleMouseClick(entity);
        }
      }
    }

    // Check for onLeave events (entities no longer hovered)
    for (const entityId of this.hoveredEntities) {
      if (!currentlyHovered.has(entityId)) {
        const entity = this.entities.find((e) => e.id === entityId);
        if (entity) {
          this.handleMouseLeave(entity);
        }
      }
    }

    // Update state
    this.hoveredEntities = currentlyHovered;
    this.lastMousePosition = currentMousePos;
    this.wasMouseDownLastFrame = this.isMouseDown;
  }

  /**
   * Check if a point is within an entity's bounds
   */
  private isPointInEntityBounds(point: Vec2, entity: PhysicsEntity): boolean {
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
   * Handle mouse enter event
   */
  private handleMouseEnter(entity: PhysicsEntity): void {
    const callbacks = (entity as any).mouseCallbacks as MouseInteractionCallbacks;
    if (callbacks?.onEnter) {
      callbacks.onEnter(entity);
    }

    // Change cursor if entity is clickable
    if (entity.hasTag("clickable")) {
      document.body.style.cursor = "pointer";
    }

    console.log(`[MouseInteraction] Mouse entered entity: ${entity.id}`);
  }

  /**
   * Handle mouse leave event
   */
  private handleMouseLeave(entity: PhysicsEntity): void {
    const callbacks = (entity as any).mouseCallbacks as MouseInteractionCallbacks;
    if (callbacks?.onLeave) {
      callbacks.onLeave(entity);
    }

    // Reset cursor
    document.body.style.cursor = "default";

    console.log(`[MouseInteraction] Mouse left entity: ${entity.id}`);
  }

  /**
   * Handle mouse hover event
   */
  private handleMouseHover(entity: PhysicsEntity): void {
    const callbacks = (entity as any).mouseCallbacks as MouseInteractionCallbacks;
    if (callbacks?.onHover) {
      callbacks.onHover(entity);
    }
  }

  /**
   * Handle mouse click event
   */
  private handleMouseClick(entity: PhysicsEntity): void {
    const callbacks = (entity as any).mouseCallbacks as MouseInteractionCallbacks;
    if (callbacks?.onClick) {
      callbacks.onClick(entity);
    }

    // Also check for legacy onClickCallback
    const legacyCallback = (entity as any).onClickCallback;
    if (legacyCallback && typeof legacyCallback === "function") {
      legacyCallback(entity);
    }

    console.log(`[MouseInteraction] Entity clicked: ${entity.id}`);
  }

  /**
   * Set mouse down state (call this from mouse event handlers)
   */
  public setMouseDown(isDown: boolean): void {
    this.isMouseDown = isDown;
  }

  /**
   * Clear all registered entities
   */
  public clear(): void {
    this.entities.length = 0;
    this.hoveredEntities.clear();
  }

  /**
   * Get all currently hovered entities
   */
  public getHoveredEntities(): PhysicsEntity[] {
    return this.entities.filter((entity) => this.hoveredEntities.has(entity.id));
  }
}

// Export singleton instance
export const mouseInteractionSystem = new MouseInteractionSystem();

/**
 * Helper function to set mouse interaction callbacks on an entity
 */
export function setEntityMouseCallbacks(
  entity: PhysicsEntity,
  callbacks: MouseInteractionCallbacks
): void {
  (entity as any).mouseCallbacks = callbacks;
  mouseInteractionSystem.registerEntity(entity);
}

export default mouseInteractionSystem;

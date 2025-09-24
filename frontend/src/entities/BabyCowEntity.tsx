import { PhysicsEntity } from "../engine/physics";
import { Vec2 } from "../engine/physics/Vec2";
import { CharacterAnimation } from "../engine/graphics/AnimationStateMachine";
import { AnimationLoader } from "../engine/graphics/AnimationLoader";
import { CowBaby, buildCowBabyStateMachine } from "../scripts/CowBabyStateMachine";
import { RectangleCollider } from "../engine/physics/Collider";
import * as PIXI from "pixi.js";

/**
 * BabyCowEntity - A PhysicsEntity wrapper for CowBaby instances
 * Provides integration with the world physics system while maintaining
 * the CowBaby's internal state machine and movement logic
 */
export class BabyCowEntity extends PhysicsEntity {
  private cowBaby: CowBaby;
  private characterAnimation: CharacterAnimation;
  private centerConstraint: Vec2;
  private maxRadius: number = 150; // 150px radius as requested

  constructor(position: Vec2, cowBaby: CowBaby, characterAnimation: CharacterAnimation) {
    // Create the base physics entity with proper size
    const entitySize = new Vec2(32 * 3, 32 * 3); // Scaled cow baby size
    super(
      position,
      entitySize,
      `baby_cow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );

    // Store references
    this.cowBaby = cowBaby;
    this.characterAnimation = characterAnimation;

    // Set center constraint to camera center
    this.centerConstraint = new Vec2(960, 540); // DESIGN_WIDTH/2, DESIGN_HEIGHT/2

    // Set up as dynamic entity
    this.isStatic = false;
    this.mass = 1.0;

    // Add appropriate tags
    this.addTag("baby_cow");
    this.addTag("animated");
    this.addTag("pet");

    // Set physics properties for smooth movement
    this.friction = 0.1;
    this.restitution = 0.2;
  }

  /**
   * Update the baby cow entity - delegates to CowBaby logic and syncs position
   */
  public update(): void {
    // Let the parent entity handle basic physics
    super.update();

    // Update the internal CowBaby with delta time
    const deltaTime = 1 / 60; // Approximate delta time (will be passed from world handler)
    this.cowBaby.update(deltaTime);

    // Sync position from CowBaby rigidbody to this entity
    const cowPosition = this.cowBaby.rigidbody.position;
    if (cowPosition.x !== this.position.x || cowPosition.y !== this.position.y) {
      this.setPosition(cowPosition.clone());
      this.isChanged = true; // Mark as changed instead of private markChanged()
    }

    // Update sprite z-index based on y position
    const sprite = this.characterAnimation.getSprite();
    if (sprite) {
      sprite.zIndex = this.position.y;
    }

    // Enforce radius constraint (150px from camera center)
    this.enforceRadiusConstraint();
  }

  /**
   * Enforce the radius constraint around the center position
   */
  private enforceRadiusConstraint(): void {
    const deltaX = this.position.x - this.centerConstraint.x;
    const deltaY = this.position.y - this.centerConstraint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > this.maxRadius) {
      // Move back to within radius
      const scale = this.maxRadius / distance;
      const constrainedX = this.centerConstraint.x + deltaX * scale;
      const constrainedY = this.centerConstraint.y + deltaY * scale;

      const constrainedPos = new Vec2(constrainedX, constrainedY);
      this.setPosition(constrainedPos);

      // Also update the CowBaby's rigidbody position
      this.cowBaby.rigidbody.setPosition(constrainedPos);
      this.cowBaby.rigidbody.stop(); // Stop movement when hitting boundary

      this.isChanged = true; // Mark as changed instead of private markChanged()
    }
  }

  /**
   * Get the character animation for external access
   */
  public getCharacterAnimation(): CharacterAnimation {
    return this.characterAnimation;
  }

  /**
   * Get the internal CowBaby instance
   */
  public getCowBaby(): CowBaby {
    return this.cowBaby;
  }

  /**
   * Override setPosition to sync with CowBaby rigidbody
   */
  public setPosition(position: Vec2): void {
    super.setPosition(position);

    // Sync position to CowBaby rigidbody
    if (this.cowBaby) {
      this.cowBaby.rigidbody.setPosition(position);
    }
  }

  /**
   * Set the center constraint position (e.g., camera center)
   */
  public setCenterConstraint(center: Vec2): void {
    this.centerConstraint = center.clone();
  }

  /**
   * Set the maximum radius from center
   */
  public setMaxRadius(radius: number): void {
    this.maxRadius = radius;
  }

  /**
   * Factory method to create a BabyCowEntity with all necessary components
   */
  public static async create(
    pixiApp: PIXI.Application,
    animationLoader: AnimationLoader,
    position: Vec2,
    worldContainer: PIXI.Container
  ): Promise<BabyCowEntity> {
    // Build the character animation state machine
    const characterAnimation = await buildCowBabyStateMachine(pixiApp, animationLoader);

    // Create the CowBaby instance
    const sprite = characterAnimation.getSprite();
    const entitySize = new Vec2(32 * 3, 32 * 3);

    // Import Rigidbody properly
    const { Rigidbody } = await import("../engine/physics/Rigidbody");
    const rigidbody = new Rigidbody(sprite, entitySize, 80); // Max speed 80 px/s
    rigidbody.setPosition(position);

    // Set up sprite properties
    sprite.anchor.set(0.5);
    sprite.scale.set(3);
    sprite.position.set(position.x, position.y);
    sprite.zIndex = position.y; // Set initial z-index
    worldContainer.addChild(sprite);

    const cowBaby = new CowBaby(rigidbody, characterAnimation);

    // Create and return the BabyCowEntity
    const entity = new BabyCowEntity(position, cowBaby, characterAnimation);

    return entity;
  }

  /**
   * Clean up resources when entity is destroyed
   */
  public destroy(): void {
    // Clean up sprite from container
    const sprite = this.characterAnimation.getSprite();
    if (sprite && sprite.parent) {
      sprite.parent.removeChild(sprite);
      sprite.destroy();
    }

    // Entity doesn't have a destroy method, just mark as inactive
    this.isActive = false;
  }
}

export default BabyCowEntity;

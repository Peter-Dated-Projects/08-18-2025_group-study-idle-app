import { Entity } from "./Entity";
import { Vec2 } from "./Vec2";
import { AABBCollider } from "./AABBCollider";
import { CowBaby } from "../../scripts/CowBabyStateMachine";
import { getDeltaTime } from "../TimeManager";

/**
 * AnimatedEntity wraps animated objects like CowBaby to work with the Entity system
 */
export class AnimatedEntity extends Entity {
  private animatedObject: CowBaby | null = null;

  constructor(id: string, position: Vec2, size: Vec2, mass: number = 1) {
    super();
    this.id = id;
    this.position = new Vec2(position.x, position.y);
    this.mass = mass;
    this.collider = new AABBCollider(position, size);
    this.isStatic = false;
    this.isActive = true;
  }

  /**
   * Set the animated object (like CowBaby) this entity wraps
   */
  public setAnimatedObject(animatedObject: CowBaby): void {
    this.animatedObject = animatedObject;
  }

  /**
   * Get the wrapped animated object
   */
  public getAnimatedObject(): CowBaby | null {
    return this.animatedObject;
  }

  /**
   * Override update to handle both Entity physics and animated object updates
   */
  public update(): void {
    if (!this.isActive) return;

    const deltaTime = getDeltaTime();

    // Update the animated object if it exists
    if (this.animatedObject) {
      // Update the animated object with deltaTime
      this.animatedObject.update(deltaTime);

      // Sync position from animated object's rigidbody to this entity
      const animatedPos = this.animatedObject.rigidbody.rect.position;
      this.position.set(animatedPos.x, animatedPos.y);

      // Update collider position
      if (this.collider) {
        this.collider.setPosition(this.position);
      }

      // Mark as changed if the animated object indicates changes
      if (this.animatedObject.rigidbody.isChanged) {
        this.isChanged = true;
        this.animatedObject.rigidbody.resetChanged();
      }
    } else {
      // Fall back to normal entity physics if no animated object
      super.update();
    }
  }

  /**
   * Override setPosition to sync with animated object
   */
  public setPosition(position: Vec2): void {
    super.setPosition(position);

    if (this.animatedObject) {
      this.animatedObject.rigidbody.setPosition(position);
    }
  }

  /**
   * Get collider from animated object if available, otherwise use entity collider
   */
  public getCollider() {
    if (this.animatedObject) {
      return this.animatedObject.getCollider();
    }
    return this.collider;
  }
}

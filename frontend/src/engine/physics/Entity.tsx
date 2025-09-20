import { Vec2 } from "./Vec2";
import { AABBCollider } from "./AABBCollider";
import { getDeltaTime } from "../TimeManager";

export class Entity {
  public id: string = "";
  public position: Vec2 = new Vec2();
  public velocity: Vec2 = new Vec2();
  public acceleration: Vec2 = new Vec2();
  public mass: number = 1;
  public collider: AABBCollider | null = null;
  public isStatic: boolean = false;
  public isActive: boolean = true;
  public tags: Set<string> = new Set<string>();
  public restitution: number = 0.5;

  // Rendering properties
  public visible: boolean = true;
  public tint: number = 0xffffff;

  // Physics properties
  public friction: number = 0.1;
  public drag: number = 0.01;

  // Change tracking for backward compatibility
  private _isChanged: boolean = false;

  // Backward compatibility getter for rect property
  public get rect() {
    return {
      position: { x: this.position.x, y: this.position.y },
      area: {
        width: this.collider?.size.x || 32,
        height: this.collider?.size.y || 32,
      },
    };
  }

  // Backward compatibility for change tracking
  public get isChanged(): boolean {
    return this._isChanged;
  }

  public set isChanged(value: boolean) {
    this._isChanged = value;
  }

  public resetChanged(): void {
    this._isChanged = false;
  }

  private markChanged(): void {
    this._isChanged = true;
  }

  constructor(
    position: Vec2 | { x: number; y: number } = new Vec2(),
    size: Vec2 = new Vec2(32, 32),
    id?: string
  ) {
    this.id = id || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Safely handle position parameter
    if (position instanceof Vec2) {
      this.position = position.clone();
    } else if (position && typeof position === "object" && "x" in position && "y" in position) {
      // Handle plain objects like { x: number, y: number }
      this.position = new Vec2(position.x, position.y);
    } else {
      this.position = new Vec2();
    }

    this.velocity = new Vec2();
    this.acceleration = new Vec2();
    this.mass = 1;
    this.collider = new AABBCollider(this.position, size);
    this.isStatic = false;
    this.isActive = true;
    this.tags = new Set<string>();
    this.restitution = 0.5;
  }

  public update(): void {
    if (!this.isActive || this.isStatic) return;

    const deltaTime = getDeltaTime();

    // Store old position to detect changes
    const oldX = this.position.x;
    const oldY = this.position.y;

    this.velocity.add(Vec2.multiply(this.acceleration, deltaTime));
    this.position.add(Vec2.multiply(this.velocity, deltaTime));

    // Mark as changed if position changed
    if (oldX !== this.position.x || oldY !== this.position.y) {
      this.markChanged();
    }

    if (this.collider) {
      this.collider.setPosition(this.position);
    }
  }

  public setPosition(position: Vec2): void {
    this.position.set(position.x, position.y);
    this.markChanged();
    if (this.collider) {
      this.collider.setPosition(this.position);
    }
  }

  public applyForce(force: Vec2): void {
    if (this.isStatic || this.mass <= 0) return;
    const acceleration = Vec2.multiply(force, 1 / this.mass);
    this.acceleration.add(acceleration);
  }

  public addTag(tag: string): void {
    this.tags.add(tag);
  }

  public removeTag(tag: string): void {
    this.tags.delete(tag);
  }

  public hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  public isCollidingWith(other: Entity): boolean {
    if (!this.collider || !other.collider) return false;
    return this.collider.intersects(other.collider);
  }

  public resolveCollision(other: Entity): void {
    if (!this.collider || !other.collider || (this.isStatic && other.isStatic)) return;

    const mtv = this.collider.getMTV(other.collider);
    if (!mtv) return;

    // Separate the entities
    if (this.isStatic) {
      other.translate(mtv);
    } else if (other.isStatic) {
      this.translate(Vec2.multiply(mtv, -1));
    } else {
      // Both are dynamic, split the separation
      const halfMTV = Vec2.multiply(mtv, 0.5);
      this.translate(Vec2.multiply(halfMTV, -1));
      other.translate(halfMTV);
    }
  }

  public translate(offset: Vec2): void {
    this.position.add(offset);
    this.markChanged();
    if (this.collider) {
      this.collider.setPosition(this.position);
    }
  }

  static createStatic(position: Vec2, size: Vec2, id?: string): Entity {
    const entity = new Entity(position, size, id);
    entity.isStatic = true;
    entity.mass = Infinity;
    return entity;
  }

  static createDynamic(position: Vec2, size: Vec2, mass: number = 1, id?: string): Entity {
    const entity = new Entity(position, size, id);
    entity.mass = mass;
    return entity;
  }
}

export default Entity;

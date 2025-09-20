import { Vec2 } from "./Vec2";

/**
 * Axis-Aligned Bounding Box collider for efficient collision detection
 */
export class AABBCollider {
  public position: Vec2;
  public size: Vec2;

  constructor(position: Vec2 = new Vec2(), size: Vec2 = new Vec2(1, 1)) {
    this.position = position.clone();
    this.size = size.clone();
  }

  /**
   * Get the minimum corner of the AABB
   */
  get min(): Vec2 {
    return new Vec2(this.position.x - this.size.x / 2, this.position.y - this.size.y / 2);
  }

  /**
   * Get the maximum corner of the AABB
   */
  get max(): Vec2 {
    return new Vec2(this.position.x + this.size.x / 2, this.position.y + this.size.y / 2);
  }

  /**
   * Get the center position of the AABB
   */
  get center(): Vec2 {
    return this.position.clone();
  }

  /**
   * Get the half-extents of the AABB
   */
  get halfSize(): Vec2 {
    return new Vec2(this.size.x / 2, this.size.y / 2);
  }

  /**
   * Get the left edge x-coordinate
   */
  get left(): number {
    return this.position.x - this.size.x / 2;
  }

  /**
   * Get the right edge x-coordinate
   */
  get right(): number {
    return this.position.x + this.size.x / 2;
  }

  /**
   * Get the top edge y-coordinate
   */
  get top(): number {
    return this.position.y - this.size.y / 2;
  }

  /**
   * Get the bottom edge y-coordinate
   */
  get bottom(): number {
    return this.position.y + this.size.y / 2;
  }

  /**
   * Clone this AABB collider
   */
  clone(): AABBCollider {
    return new AABBCollider(this.position.clone(), this.size.clone());
  }

  /**
   * Set the position of the AABB
   */
  setPosition(position: Vec2): AABBCollider {
    this.position.set(position.x, position.y);
    return this;
  }

  /**
   * Set the size of the AABB
   */
  setSize(size: Vec2): AABBCollider {
    this.size.set(size.x, size.y);
    return this;
  }

  /**
   * Move the AABB by an offset
   */
  translate(offset: Vec2): AABBCollider {
    this.position.add(offset);
    return this;
  }

  /**
   * Scale the AABB by a factor
   */
  scale(factor: number): AABBCollider {
    this.size.multiply(factor);
    return this;
  }

  /**
   * Check if this AABB contains a point
   */
  containsPoint(point: Vec2): boolean {
    return (
      point.x >= this.left && point.x <= this.right && point.y >= this.top && point.y <= this.bottom
    );
  }

  /**
   * Check if this AABB intersects with another AABB
   */
  intersects(other: AABBCollider): boolean {
    return (
      this.left < other.right &&
      this.right > other.left &&
      this.top < other.bottom &&
      this.bottom > other.top
    );
  }

  /**
   * Check if this AABB completely contains another AABB
   */
  contains(other: AABBCollider): boolean {
    return (
      this.left <= other.left &&
      this.right >= other.right &&
      this.top <= other.top &&
      this.bottom >= other.bottom
    );
  }

  /**
   * Get the overlap area with another AABB
   */
  getOverlap(other: AABBCollider): AABBCollider | null {
    if (!this.intersects(other)) {
      return null;
    }

    const left = Math.max(this.left, other.left);
    const right = Math.min(this.right, other.right);
    const top = Math.max(this.top, other.top);
    const bottom = Math.min(this.bottom, other.bottom);

    const overlapPosition = new Vec2((left + right) / 2, (top + bottom) / 2);
    const overlapSize = new Vec2(right - left, bottom - top);

    return new AABBCollider(overlapPosition, overlapSize);
  }

  /**
   * Get the minimum translation vector to separate from another AABB
   */
  getMTV(other: AABBCollider): Vec2 | null {
    if (!this.intersects(other)) {
      return null;
    }

    const overlapX = Math.min(this.right - other.left, other.right - this.left);
    const overlapY = Math.min(this.bottom - other.top, other.bottom - this.top);

    if (overlapX < overlapY) {
      // Separate horizontally
      const direction = this.center.x < other.center.x ? -1 : 1;
      return new Vec2(overlapX * direction, 0);
    } else {
      // Separate vertically
      const direction = this.center.y < other.center.y ? -1 : 1;
      return new Vec2(0, overlapY * direction);
    }
  }

  /**
   * Get the closest point on this AABB to a given point
   */
  closestPoint(point: Vec2): Vec2 {
    const x = Math.max(this.left, Math.min(point.x, this.right));
    const y = Math.max(this.top, Math.min(point.y, this.bottom));
    return new Vec2(x, y);
  }

  /**
   * Get the distance from this AABB to a point
   */
  distanceToPoint(point: Vec2): number {
    const closest = this.closestPoint(point);
    return point.distanceTo(closest);
  }

  /**
   * Expand the AABB by a given amount in all directions
   */
  expand(amount: number): AABBCollider {
    this.size.add(new Vec2(amount * 2, amount * 2));
    return this;
  }

  /**
   * Shrink the AABB by a given amount in all directions
   */
  shrink(amount: number): AABBCollider {
    this.size.subtract(new Vec2(amount * 2, amount * 2));
    // Ensure size doesn't go negative
    this.size.x = Math.max(0, this.size.x);
    this.size.y = Math.max(0, this.size.y);
    return this;
  }

  /**
   * Get the area of the AABB
   */
  area(): number {
    return this.size.x * this.size.y;
  }

  /**
   * Get the perimeter of the AABB
   */
  perimeter(): number {
    return 2 * (this.size.x + this.size.y);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `AABB(pos: ${this.position.toString()}, size: ${this.size.toString()})`;
  }

  // Static utility methods

  /**
   * Create an AABB from minimum and maximum points
   */
  static fromMinMax(min: Vec2, max: Vec2): AABBCollider {
    const center = new Vec2((min.x + max.x) / 2, (min.y + max.y) / 2);
    const size = new Vec2(max.x - min.x, max.y - min.y);
    return new AABBCollider(center, size);
  }

  /**
   * Create an AABB from a center point and half-extents
   */
  static fromCenterAndHalfSize(center: Vec2, halfSize: Vec2): AABBCollider {
    return new AABBCollider(center, new Vec2(halfSize.x * 2, halfSize.y * 2));
  }

  /**
   * Create an AABB that encompasses multiple points
   */
  static fromPoints(points: Vec2[]): AABBCollider {
    if (points.length === 0) {
      return new AABBCollider();
    }

    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    return AABBCollider.fromMinMax(new Vec2(minX, minY), new Vec2(maxX, maxY));
  }

  /**
   * Create an AABB that encompasses multiple AABBs
   */
  static fromAABBs(aabbs: AABBCollider[]): AABBCollider {
    if (aabbs.length === 0) {
      return new AABBCollider();
    }

    let minX = aabbs[0].left;
    let maxX = aabbs[0].right;
    let minY = aabbs[0].top;
    let maxY = aabbs[0].bottom;

    for (const aabb of aabbs) {
      minX = Math.min(minX, aabb.left);
      maxX = Math.max(maxX, aabb.right);
      minY = Math.min(minY, aabb.top);
      maxY = Math.max(maxY, aabb.bottom);
    }

    return AABBCollider.fromMinMax(new Vec2(minX, minY), new Vec2(maxX, maxY));
  }
}

export default AABBCollider;

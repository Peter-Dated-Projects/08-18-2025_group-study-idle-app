/**
 * 2D Vector class for position, velocity, and direction calculations
 */
export class Vec2 {
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Create a new Vec2 from this vector
   */
  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  /**
   * Set the components of this vector
   */
  set(x: number, y: number): Vec2 {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Add another vector to this vector
   */
  add(other: Vec2): Vec2 {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  /**
   * Subtract another vector from this vector
   */
  subtract(other: Vec2): Vec2 {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  /**
   * Multiply this vector by a scalar
   */
  multiply(scalar: number): Vec2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  /**
   * Divide this vector by a scalar
   */
  divide(scalar: number): Vec2 {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
    }
    return this;
  }

  /**
   * Get the magnitude (length) of this vector
   */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Get the squared magnitude (more efficient than magnitude)
   */
  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Normalize this vector (make it unit length)
   */
  normalize(): Vec2 {
    const mag = this.magnitude();
    if (mag > 0) {
      this.x /= mag;
      this.y /= mag;
    }
    return this;
  }

  /**
   * Get a normalized copy of this vector
   */
  normalized(): Vec2 {
    return this.clone().normalize();
  }

  /**
   * Calculate the dot product with another vector
   */
  dot(other: Vec2): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Calculate the distance to another vector
   */
  distanceTo(other: Vec2): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate the squared distance to another vector (more efficient)
   */
  distanceSquaredTo(other: Vec2): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }

  /**
   * Linearly interpolate between this vector and another
   */
  lerp(other: Vec2, t: number): Vec2 {
    this.x = this.x + (other.x - this.x) * t;
    this.y = this.y + (other.y - this.y) * t;
    return this;
  }

  /**
   * Rotate this vector by an angle (in radians)
   */
  rotate(angle: number): Vec2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const newX = this.x * cos - this.y * sin;
    const newY = this.x * sin + this.y * cos;
    this.x = newX;
    this.y = newY;
    return this;
  }

  /**
   * Get the angle of this vector (in radians)
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Check if this vector equals another vector
   */
  equals(other: Vec2, tolerance: number = 0.001): boolean {
    return Math.abs(this.x - other.x) < tolerance && Math.abs(this.y - other.y) < tolerance;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Vec2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }

  // Static utility methods
  static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  static one(): Vec2 {
    return new Vec2(1, 1);
  }

  static up(): Vec2 {
    return new Vec2(0, -1);
  }

  static down(): Vec2 {
    return new Vec2(0, 1);
  }

  static left(): Vec2 {
    return new Vec2(-1, 0);
  }

  static right(): Vec2 {
    return new Vec2(1, 0);
  }

  /**
   * Create a vector from an angle and magnitude
   */
  static fromAngle(angle: number, magnitude: number = 1): Vec2 {
    return new Vec2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  /**
   * Add two vectors and return a new vector
   */
  static add(a: Vec2, b: Vec2): Vec2 {
    return new Vec2(a.x + b.x, a.y + b.y);
  }

  /**
   * Subtract two vectors and return a new vector
   */
  static subtract(a: Vec2, b: Vec2): Vec2 {
    return new Vec2(a.x - b.x, a.y - b.y);
  }

  /**
   * Multiply a vector by a scalar and return a new vector
   */
  static multiply(vec: Vec2, scalar: number): Vec2 {
    return new Vec2(vec.x * scalar, vec.y * scalar);
  }

  /**
   * Calculate distance between two vectors
   */
  static distance(a: Vec2, b: Vec2): number {
    return a.distanceTo(b);
  }

  /**
   * Linearly interpolate between two vectors
   */
  static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
}

/**
 * Utility function to normalize a Vec2 (standalone function as requested)
 */
export function normalizeVec2(vec: Vec2): Vec2 {
  return vec.normalized();
}

export default Vec2;

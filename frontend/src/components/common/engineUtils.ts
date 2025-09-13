// Common engine utilities and types

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

// Mathematical utilities
export const MathUtils = {
  // Distance between two points
  distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  },

  // Linear interpolation
  lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  },

  // Clamp value between min and max
  clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  },

  // Normalize angle to 0-2π range
  normalizeAngle(angle: number): number {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
  },

  // Random number between min and max
  random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  },

  // Random integer between min and max (inclusive)
  randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
};

// Collision detection utilities
export const CollisionUtils = {
  // Point in rectangle
  pointInRect(point: Point, rect: Rect): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  },

  // Rectangle overlap
  rectsOverlap(rect1: Rect, rect2: Rect): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  },

  // Circle collision
  circleCollision(pos1: Point, radius1: number, pos2: Point, radius2: number): boolean {
    const distance = MathUtils.distance(pos1, pos2);
    return distance < radius1 + radius2;
  },
};

// Vector utilities
export const VectorUtils = {
  // Add two vectors
  add(v1: Vector2D, v2: Vector2D): Vector2D {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
  },

  // Subtract two vectors
  subtract(v1: Vector2D, v2: Vector2D): Vector2D {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
  },

  // Multiply vector by scalar
  multiply(vector: Vector2D, scalar: number): Vector2D {
    return { x: vector.x * scalar, y: vector.y * scalar };
  },

  // Get vector magnitude
  magnitude(vector: Vector2D): number {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  },

  // Normalize vector
  normalize(vector: Vector2D): Vector2D {
    const mag = VectorUtils.magnitude(vector);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: vector.x / mag, y: vector.y / mag };
  },

  // Dot product
  dot(v1: Vector2D, v2: Vector2D): number {
    return v1.x * v2.x + v1.y * v2.y;
  },
};

// Animation utilities
export const AnimationUtils = {
  // Easing functions
  easeInOut(t: number): number {
    return t * t * (3 - 2 * t);
  },

  easeIn(t: number): number {
    return t * t;
  },

  easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t);
  },

  // Spring animation
  spring(
    current: number,
    target: number,
    velocity: number,
    damping: number = 0.8,
    stiffness: number = 0.1
  ): { position: number; velocity: number } {
    const force = (target - current) * stiffness;
    velocity += force;
    velocity *= damping;
    return {
      position: current + velocity,
      velocity: velocity,
    };
  },
};

// File loading utilities (from utils.tsx)
export const FileUtils = {
  loadTextFile(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fetch(file)
        .then((response) => {
          if (!response.ok) throw new Error("Network response was not ok");
          return response.text();
        })
        .then(resolve)
        .catch(reject);
    });
  },

  loadJsonFile<T>(file: string): Promise<T> {
    return new Promise((resolve, reject) => {
      fetch(file)
        .then((response) => {
          if (!response.ok) throw new Error("Network response was not ok");
          return response.json();
        })
        .then(resolve)
        .catch(reject);
    });
  },
};

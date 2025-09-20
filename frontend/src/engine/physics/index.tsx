// Re-export all physics components for easy importing
export { Vec2, normalizeVec2 } from "./Vec2";
export { AABBCollider } from "./AABBCollider";
export { Entity as PhysicsEntity } from "./Entity";

// Export default classes
export { default as DefaultVec2 } from "./Vec2";
export { default as DefaultAABBCollider } from "./AABBCollider";
export { default as DefaultEntity } from "./Entity";

// Legacy physics components (moved from main engine folder)
export * from "./Collider";
export * from "./EntityUtils";
export type { Rect as PhysicsRect } from "./Rect";
export * from "./Rigidbody";
export { Entity as LegacyEntity } from "./LegacyEntity";

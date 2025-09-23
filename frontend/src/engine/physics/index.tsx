// Re-export all physics components for easy importing
export { Vec2, normalizeVec2 } from "./Vec2";
export { AABBCollider } from "./AABBCollider";
export { Entity as PhysicsEntity } from "./Entity";
export { AnimatedEntity } from "./AnimatedEntity";
export { ConstructionSite } from "./ConstructionSite";

// Export Structure from parent folder
export { Structure } from "../../scripts/structures/Structure";

// Export default classes
export { default as DefaultVec2 } from "./Vec2";
export { default as DefaultAABBCollider } from "./AABBCollider";
export { default as DefaultEntity } from "./Entity";
export { default as DefaultConstructionSite } from "./ConstructionSite";
export { default as DefaultStructure } from "../../scripts/structures/Structure";

// Legacy physics components (moved from main engine folder)
export * from "./Collider";
export * from "./EntityUtils";
export type { Rect as PhysicsRect } from "./Rect";
export * from "./Rigidbody";

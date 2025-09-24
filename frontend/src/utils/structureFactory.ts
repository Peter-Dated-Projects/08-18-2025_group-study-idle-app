/**
 * Structure creation and mapping utilities
 * Maps structure IDs to their corresponding classes for dynamic instantiation
 */

import { Vec2 } from "../engine/physics/Vec2";
import { MouseInteractionCallbacks, Structure } from "../scripts/structures/Structure";
import ChickenCoop from "../scripts/structures/ChickenCoop";
import Mailbox from "../scripts/structures/Mailbox";
import Picnic from "../scripts/structures/Picnic";
import WaterWell from "../scripts/structures/WaterWell";
import Workbench from "../scripts/structures/Workbench";

// Define the structure class type
export type StructureClass = {
  create: (position: Vec2, callbacks: MouseInteractionCallbacks) => Promise<Structure>;
};

// Structure ID to class mapping
export const STRUCTURE_CLASS_MAP: Record<string, StructureClass> = {
  "chicken-coop": ChickenCoop,
  mailbox: Mailbox,
  picnic: Picnic,
  "water-well": WaterWell,
  workbench: Workbench,
  empty: Structure, // Default empty structure
};

/**
 * Create a structure instance based on its ID
 */
export async function createStructureById(
  structureId: string,
  position: Vec2,
  callbacks: MouseInteractionCallbacks
): Promise<Structure> {
  if (structureId === "empty") {
    return await Structure.create(position, callbacks);
  }

  const StructureClass = STRUCTURE_CLASS_MAP[structureId];
  if (!StructureClass) {
    console.warn(`Unknown structure ID: ${structureId}, creating empty structure`);
    return await Structure.create(position, callbacks);
  }

  return await StructureClass.create(position, callbacks);
}

/**
 * Get all available structure IDs
 */
export function getAvailableStructureIds(): string[] {
  return Object.keys(STRUCTURE_CLASS_MAP).filter((id) => id !== "empty");
}

/**
 * Check if a structure ID is valid
 */
export function isValidStructureId(structureId: string): boolean {
  return structureId === "empty" || structureId in STRUCTURE_CLASS_MAP;
}

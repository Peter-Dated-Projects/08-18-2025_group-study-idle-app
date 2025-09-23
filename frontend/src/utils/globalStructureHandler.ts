// Global structure click handler
// This allows structure entities to trigger modal opening from anywhere in the app

import { Structure } from "@/scripts/structures/Structure";

let globalStructureClickHandler: ((structure: Structure) => void) | null = null;

/**
 * Set the global structure click handler
 */
export function setGlobalStructureClickHandler(handler: (structure: Structure) => void): void {
  globalStructureClickHandler = handler;
}

/**
 * Call the global structure click handler
 */
export function callGlobalStructureClickHandler(structure: Structure): void {
  if (globalStructureClickHandler) {
    globalStructureClickHandler(structure);
  } else {
    console.warn("Global structure click handler not set");
  }
}

/**
 * Clear the global structure click handler
 */
export function clearGlobalStructureClickHandler(): void {
  globalStructureClickHandler = null;
}

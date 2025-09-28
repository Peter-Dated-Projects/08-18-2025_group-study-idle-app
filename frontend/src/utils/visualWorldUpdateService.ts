/**
 * Visual World Update Service
 * Manages visual updates to the PixiJS world when structures are modified
 * Tracks entity references and handles proper renderer cleanup/recreation
 */

import { WorldPhysicsHandler } from "../engine/WorldPhysicsHandler";
import { RendererHandler } from "../engine/rendering/RendererHandler";
import { SpriteRenderer } from "../engine/rendering/SpriteRenderer";
import { Structure } from "../scripts/structures/Structure";
import { createStructureById } from "./structureFactory";
import { Vec2 } from "../engine/physics/Vec2";
import { MouseInteractionCallbacks } from "../scripts/structures/Structure";
import { callGlobalStructureClickHandler } from "./globalStructureHandler";

export interface TrackedStructure {
  plotIndex: number;
  entity: Structure;
  rendererId: string;
  structureId: string; // Store the original structure ID (e.g., "mailbox", "chicken-coop")
}

/**
 * Service to handle visual updates to the PixiJS world
 */
export class VisualWorldUpdateService {
  private static instance: VisualWorldUpdateService;
  private worldHandler: WorldPhysicsHandler | null = null;
  private rendererHandler: RendererHandler | null = null;
  private trackedStructures: Map<number, TrackedStructure> = new Map();
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): VisualWorldUpdateService {
    if (!VisualWorldUpdateService.instance) {
      VisualWorldUpdateService.instance = new VisualWorldUpdateService();
    }
    return VisualWorldUpdateService.instance;
  }

  /**
   * Initialize the service with world handlers
   */
  initialize(
    worldHandler: WorldPhysicsHandler,
    rendererHandler: RendererHandler,
    userId: string
  ): void {
    this.worldHandler = worldHandler;
    this.rendererHandler = rendererHandler;
    this.userId = userId;

    // Track existing structures
    this.trackExistingStructures();
    console.log(`[VisualWorldUpdateService] Initialized for user: ${userId}`);
    console.log(`[VisualWorldUpdateService] Tracking ${this.trackedStructures.size} structures`);
  }

  /**
   * Track all existing structure entities in the world
   */
  private trackExistingStructures(): void {
    if (!this.worldHandler) return;

    const structures = this.worldHandler
      .getAllEntities()
      .filter((entity) => entity.hasTag("structure")) as Structure[];

    structures.forEach((structure) => {
      const plotIndex = this.getPlotIndexFromPosition(structure.position);
      if (plotIndex !== -1) {
        // For existing structures, we need to determine the structure type
        // This is tricky since we don't have the original ID stored
        // For now, we'll assume "empty" and let the sync process handle it
        this.trackedStructures.set(plotIndex, {
          plotIndex,
          entity: structure,
          rendererId: structure.id,
          structureId: "empty", // Will be updated during sync
        });
      }
    });
  }

  /**
   * Get plot index based on structure position (matches DefaultWorld positioning)
   */
  private getPlotIndexFromPosition(position: Vec2): number {
    const DESIGN_WIDTH = 1920;
    const DESIGN_HEIGHT = 1080;
    const centerX = DESIGN_WIDTH / 2;
    const centerY = DESIGN_HEIGHT / 2;
    const plotDistance = 200;

    const expectedPositions = [
      new Vec2(centerX - plotDistance * 2, centerY + plotDistance * 0.5),
      new Vec2(centerX - plotDistance * 1.5, centerY - plotDistance * 0.5),
      new Vec2(centerX - plotDistance, centerY - plotDistance * 1.5),
      new Vec2(centerX, centerY - plotDistance * 1.5),
      new Vec2(centerX + plotDistance, centerY - plotDistance * 1.5),
      new Vec2(centerX + plotDistance * 1.5, centerY - plotDistance * 0.5),
      new Vec2(centerX + plotDistance * 2, centerY + plotDistance * 0.5),
    ];

    // Find closest position match
    let closestIndex = -1;
    let minDistance = Infinity;

    expectedPositions.forEach((expectedPos, index) => {
      const distance = Math.sqrt(
        Math.pow(position.x - expectedPos.x, 2) + Math.pow(position.y - expectedPos.y, 2)
      );
      if (distance < minDistance && distance < 50) {
        // 50px tolerance
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  /**
   * Update a specific structure plot visually
   */
  async updateStructurePlot(plotIndex: number, newStructureId: string): Promise<boolean> {
    if (!this.worldHandler || !this.rendererHandler) {
      console.error("[VisualWorldUpdateService] Not initialized");
      return false;
    }

    try {
      // Get the current tracked structure at this plot
      const currentTracked = this.trackedStructures.get(plotIndex);

      // Remove current structure entity and renderer if it exists
      if (currentTracked) {
        console.log(
          `[VisualWorldUpdateService] Removing structure ${currentTracked.entity.id} from plot ${plotIndex}`
        );

        // Remove from renderer system
        this.rendererHandler.removeRenderer(currentTracked.rendererId);

        // Remove from world physics handler
        this.worldHandler.removeEntityByReference(currentTracked.entity);

        // Remove from tracking
        this.trackedStructures.delete(plotIndex);
      }

      // Create new structure entity at the plot position
      const plotPosition = this.getPlotPosition(plotIndex);
      const mouseCallbacks: MouseInteractionCallbacks = {
        onClick: (entity) => {
          console.log("Structure plot clicked:", entity.id);
          const structure = entity as Structure;
          callGlobalStructureClickHandler(structure);
        },
      };

      console.log(
        `[VisualWorldUpdateService] Creating new structure ${newStructureId} at plot ${plotIndex}`
      );

      // Create new structure
      const newStructure = await createStructureById(newStructureId, plotPosition, mouseCallbacks);

      // Add to world physics handler
      this.worldHandler.addEntity(newStructure);

      // Create and register renderer
      const spriteRenderer = new SpriteRenderer();
      spriteRenderer.setDebugMode(false); // Disable debug mode to hide red rectangles
      this.rendererHandler.registerRenderer(newStructure.id, spriteRenderer);

      // Track the new structure
      this.trackedStructures.set(plotIndex, {
        plotIndex,
        entity: newStructure,
        rendererId: newStructure.id,
        structureId: newStructureId, // Store the original structure ID
      });

      console.log(
        `[VisualWorldUpdateService] Successfully updated plot ${plotIndex} to ${newStructureId}`
      );

      return true;
    } catch (error) {
      console.error(`[VisualWorldUpdateService] Error updating plot ${plotIndex}:`, error);
      return false;
    }
  }

  /**
   * Update multiple structure plots at once
   */
  async updateMultiplePlots(
    updates: Array<{ plotIndex: number; structureId: string }>
  ): Promise<boolean> {
    const results = await Promise.all(
      updates.map(({ plotIndex, structureId }) => this.updateStructurePlot(plotIndex, structureId))
    );

    return results.every((result) => result);
  }

  /**
   * Get plot position based on index (matches DefaultWorld positioning)
   */
  private getPlotPosition(index: number): Vec2 {
    const DESIGN_WIDTH = 1920;
    const DESIGN_HEIGHT = 1080;
    const centerX = DESIGN_WIDTH / 2;
    const centerY = DESIGN_HEIGHT / 2;
    const plotDistance = 200;

    const positions = [
      new Vec2(centerX - plotDistance * 2, centerY + plotDistance * 0.5),
      new Vec2(centerX - plotDistance * 1.5, centerY - plotDistance * 0.5),
      new Vec2(centerX - plotDistance, centerY - plotDistance * 1.5),
      new Vec2(centerX, centerY - plotDistance * 1.5),
      new Vec2(centerX + plotDistance, centerY - plotDistance * 1.5),
      new Vec2(centerX + plotDistance * 1.5, centerY - plotDistance * 0.5),
      new Vec2(centerX + plotDistance * 2, centerY + plotDistance * 0.5),
    ];

    return positions[index] || new Vec2(centerX, centerY);
  }

  /**
   * Get tracked structure at a specific plot
   */
  getTrackedStructure(plotIndex: number): TrackedStructure | undefined {
    return this.trackedStructures.get(plotIndex);
  }

  /**
   * Get all tracked structures
   */
  getAllTrackedStructures(): TrackedStructure[] {
    return Array.from(this.trackedStructures.values());
  }

  /**
   * Get the current structure ID at a plot
   */
  getStructureIdAtPlot(plotIndex: number): string {
    const tracked = this.trackedStructures.get(plotIndex);
    if (!tracked) return "empty";

    // Return the stored structure ID (e.g., "mailbox", "chicken-coop", "empty")
    return tracked.structureId;
  }

  /**
   * Force refresh all visual structures (fallback method)
   */
  async refreshAllStructures(): Promise<void> {
    if (!this.worldHandler || !this.rendererHandler) return;

    console.log("[VisualWorldUpdateService] Force refreshing all structures");

    // Clear all tracked structures and their renderers
    this.trackedStructures.forEach((tracked) => {
      this.rendererHandler!.removeRenderer(tracked.rendererId);
      this.worldHandler!.removeEntityByReference(tracked.entity);
    });
    this.trackedStructures.clear();

    // Re-track existing structures after refresh
    // This will be called after DefaultWorld.refreshWorldStructures completes
    setTimeout(() => {
      this.trackExistingStructures();
    }, 100);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.trackedStructures.clear();
    this.worldHandler = null;
    this.rendererHandler = null;
    this.userId = null;
    console.log("[VisualWorldUpdateService] Cleaned up resources");
  }
}

// Export singleton instance
export const visualWorldUpdateService = VisualWorldUpdateService.getInstance();

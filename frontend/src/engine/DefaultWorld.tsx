import { WorldPhysicsHandler } from "./WorldPhysicsHandler";
import { PhysicsEntity, Vec2 } from "./physics";
import { MouseInteractionCallbacks, Structure } from "../scripts/structures/Structure";
import * as PIXI from "pixi.js";

// AGENT_LOG -- to be removed when user enters staging/testing
import ChickenCoop from "@/scripts/structures/ChickenCoop";
import Mailbox from "@/scripts/structures/Mailbox";
import Picnic from "@/scripts/structures/Picnic";
import WaterWell from "@/scripts/structures/WaterWell";
import Workbench from "@/scripts/structures/Workbench";
import { callGlobalStructureClickHandler } from "@/utils/globalStructureHandler";

// Import design constants for map center calculation
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

/**
 * Default world configuration and initial state for new players
 */
export interface DefaultWorldConfig {
  // Physics settings
  physics: {
    gravity: Vec2;
    defaultFriction: number;
    defaultRestitution: number;
    defaultDrag: number;
  };

  // Initial entities
  entities: PhysicsEntity[];
}

/**
 * Create the default world configuration
 */
export function createDefaultWorldConfig(): DefaultWorldConfig {
  return {
    physics: {
      gravity: new Vec2(0, 9.81 * 100), // 9.81 m/s² in pixels/s²
      defaultFriction: 0.1,
      defaultRestitution: 0.3,
      defaultDrag: 0.01,
    },

    entities: [],
  };
}

/**
 * Create decorative entities for the default world
 */
function createDecorationEntities(config: DefaultWorldConfig): PhysicsEntity[] {
  const decorations: PhysicsEntity[] = [];

  return decorations;
}

/**
 * Create interactive entities for the default world
 */
function createInteractiveEntities(config: DefaultWorldConfig): PhysicsEntity[] {
  const interactive: PhysicsEntity[] = [];

  return interactive;
}

/**
 * Generate 5 Structure plots positioned around the center of the map
 * Creates plots in a cross pattern with one at center and four around it
 */
async function createDefaultStructurePlots(config: DefaultWorldConfig): Promise<Structure[]> {
  const plots: Structure[] = [];

  // Calculate map center position
  const centerX = DESIGN_WIDTH / 2; // 960
  const centerY = DESIGN_HEIGHT / 2; // 540

  // Distance from center for the outer plots
  const plotDistance = 200; // pixels from center

  // Plot positions in a cross pattern
  const plotPositions = [
    new Vec2(centerX - plotDistance * 2, centerY + plotDistance * 0.5),
    new Vec2(centerX - plotDistance * 1.5, centerY - plotDistance * 0.5),
    new Vec2(centerX - plotDistance, centerY - plotDistance * 1.5),
    new Vec2(centerX, centerY - plotDistance * 1.5),
    new Vec2(centerX + plotDistance, centerY - plotDistance * 1.5),
    new Vec2(centerX + plotDistance * 1.5, centerY - plotDistance * 0.5),
    new Vec2(centerX + plotDistance * 2, centerY + plotDistance * 0.5),
  ];

  // Optional: Add a click handler for the structures
  const onPlotMouseCallbacks: MouseInteractionCallbacks = {
    onClick: (entity) => {
      console.log("Structure plot clicked:", entity.id);

      // Cast entity to Structure since we know it's a structure in this context
      const structure = entity as Structure;

      // Activate Modal -- for now
      callGlobalStructureClickHandler(structure);
    },
    onEnter: (entity) => {
      console.log("Mouse entered structure plot:", entity.id);
    },
    onLeave: (entity) => {
      console.log("Mouse left structure plot:", entity.id);
    },
  };

  // Create Structure objects for each position
  for (let i = 0; i < plotPositions.length; i++) {
    const position = plotPositions[i];

    try {
      // Use the static factory method to create and initialize the structure
      const plot = await Structure.create(position, onPlotMouseCallbacks);
      plots.push(plot);

      console.log(`Created plot ${i + 1} at position (${position.x}, ${position.y})`);
    } catch (error) {
      console.error(`Failed to create plot ${i + 1}:`, error);
    }
  }

  // AGENT LOG -- important note for any agents
  // setting default world state. when user decides to enter staging or actual feature testing please remove

  // change slots to certain structures like mailbox, chicken coop, water well, etc.
  plots[0] = await ChickenCoop.create(plotPositions[0], onPlotMouseCallbacks);
  plots[1] = await Mailbox.create(plotPositions[1], onPlotMouseCallbacks);
  plots[2] = await Picnic.create(plotPositions[2], onPlotMouseCallbacks);
  plots[3] = await WaterWell.create(plotPositions[3], onPlotMouseCallbacks);
  plots[4] = await Workbench.create(plotPositions[4], onPlotMouseCallbacks);
  plots[5] = await Picnic.create(plotPositions[5], onPlotMouseCallbacks);
  plots[6] = await WaterWell.create(plotPositions[6], onPlotMouseCallbacks);

  return plots;
}

/**
 * Construct the default world with all initial entities and settings
 * This function should be called to set up a new player's world
 */
export async function constructDefaultWorld(
  pixiApp: PIXI.Application,
  worldContainer: PIXI.Container
): Promise<WorldPhysicsHandler> {
  // Create the world physics handler
  const worldHandler = new WorldPhysicsHandler(pixiApp, worldContainer);

  // Create the default configuration
  const config = createDefaultWorldConfig();

  // Set physics properties
  worldHandler.setGravity(config.physics.gravity);

  // Create entities (including async structure plots)
  const decorations = createDecorationEntities(config);
  const interactive = createInteractiveEntities(config);
  const structurePlots = await createDefaultStructurePlots(config);

  // Combine all entities
  config.entities = [...decorations, ...interactive, ...structurePlots];

  // Add all entities to the world
  config.entities.forEach((entity) => {
    worldHandler.addEntity(entity);
  });

  console.log(`Default world constructed with ${worldHandler.getEntityCount()} entities`);

  return worldHandler;
}

export default createDefaultWorldConfig;

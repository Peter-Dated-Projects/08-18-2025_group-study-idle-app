import { WorldPhysicsHandler } from "./WorldPhysicsHandler";
import { PhysicsEntity, Vec2 } from "./physics";
import { MouseInteractionCallbacks, Structure } from "../scripts/structures/Structure";
import { AnimationLoader } from "./graphics/AnimationLoader";
import BabyCowEntity from "../entities/BabyCowEntity";
import * as PIXI from "pixi.js";

// Import structure classes
import ChickenCoop from "@/scripts/structures/ChickenCoop";
import Mailbox from "@/scripts/structures/Mailbox";
import Picnic from "@/scripts/structures/Picnic";
import WaterWell from "@/scripts/structures/WaterWell";
import Workbench from "@/scripts/structures/Workbench";
import { callGlobalStructureClickHandler } from "@/utils/globalStructureHandler";

// Import configuration and services
import { getStructureConfig, EMPTY_STRUCTURE_CONFIG } from "@/config/structureConfigs";
import { getUserLevelConfig, updateSlotConfig } from "@/services/levelConfigService";
import { localDataManager } from "@/utils/localDataManager";
import { createStructureById as factoryCreateStructureById } from "@/utils/structureFactory";

// Import rendering system
import { SpriteRenderer } from "./rendering/SpriteRenderer";

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

  // User level configuration (optional)
  userLevelConfig?: string[];
  userId?: string;
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
 * Create a structure instance based on its ID
 */
async function createStructureById(
  structureId: string,
  position: Vec2,
  callbacks: MouseInteractionCallbacks
): Promise<Structure> {
  return await factoryCreateStructureById(structureId, position, callbacks);
}

/**
 * Load user level config from backend with caching
 */
async function loadUserLevelConfig(userId: string): Promise<string[]> {
  // Force fresh data load by clearing cache first
  // This ensures we always get the latest level config from backend
  localDataManager.invalidateLevelConfig(userId);
  return await localDataManager.getLevelConfig(userId);
}

/**
 * Clear the cached level config (call when user changes)
 */
export function clearLevelConfigCache(): void {
  localDataManager.clearAllCaches();
}

/**
 * Refresh structure plots in an existing world based on current backend config
 */
export async function refreshWorldStructures(
  worldHandler: WorldPhysicsHandler,
  userId: string
): Promise<void> {
  console.log(`Refreshing world structures for user: ${userId}`);

  try {
    // Clear cached data to ensure we fetch fresh backend state
    localDataManager.invalidateLevelConfig(userId);
    localDataManager.invalidateInventory(userId);

    // Get the renderer handler for setting up renderers for new entities
    const rendererHandler = worldHandler.getRendererHandler();

    // Remove existing structure plots from the world
    const existingStructures = worldHandler
      .getAllEntities()
      .filter((entity) => entity.hasTag("structure"));

    existingStructures.forEach((structure) => {
      // Clean up renderer before removing entity
      worldHandler.removeEntityRenderer(structure.id);
      // Remove entity from physics handler
      worldHandler.removeEntityByReference(structure);
    });

    // Create fresh structure plots with updated config
    const config = createDefaultWorldConfig();
    config.userId = userId;
    const newStructurePlots = await createUserStructurePlots(config);

    // Add new structure plots to the world and create renderers for them
    newStructurePlots.forEach((plot) => {
      worldHandler.addEntity(plot);

      // Create and register renderer for the new entity
      const spriteRenderer = new SpriteRenderer();
      spriteRenderer.setDebugMode(false); // Disable debug mode to hide red rectangles
      worldHandler.registerEntityRenderer(plot.id, spriteRenderer);
    });

    console.log(
      `Successfully refreshed ${newStructurePlots.length} structure plots with renderers`
    );
  } catch (error) {
    console.error("Error refreshing world structures:", error);
    throw error;
  }
}

/**
 * Create decorative entities for the default world
 */
function createDecorationEntities(config: DefaultWorldConfig): PhysicsEntity[] {
  const decorations: PhysicsEntity[] = [];

  return decorations;
}

/**
 * Create baby cow entities for the default world
 * Creates 3 baby cows within 150px of camera center as requested
 */
async function createBabyCowEntities(
  pixiApp: PIXI.Application,
  worldContainer: PIXI.Container
): Promise<BabyCowEntity[]> {
  const babyCows: BabyCowEntity[] = [];

  // Create animation loader for baby cows
  const animationLoader = new AnimationLoader();

  // Calculate camera center
  const centerX = DESIGN_WIDTH / 2;
  const centerY = DESIGN_HEIGHT / 2;

  // Create 3 baby cows at different positions around the center
  const positions = [
    new Vec2(centerX - 80, centerY - 60), // Top-left of center
    new Vec2(centerX + 100, centerY + 40), // Bottom-right of center
    new Vec2(centerX - 30, centerY + 90), // Bottom of center
  ];

  for (let i = 0; i < positions.length; i++) {
    try {
      const position = positions[i];
      const babyCow = await BabyCowEntity.create(
        pixiApp,
        animationLoader,
        position,
        worldContainer
      );

      // Set the center constraint to camera center with 150px radius
      babyCow.setCenterConstraint(new Vec2(centerX, centerY));
      babyCow.setMaxRadius(150);

      babyCows.push(babyCow);
      console.log(`Created baby cow ${i + 1} at position (${position.x}, ${position.y})`);
    } catch (error) {
      console.error(`Failed to create baby cow ${i + 1}:`, error);
    }
  }

  return babyCows;
}

/**
 * Create interactive entities for the default world
 */
function createInteractiveEntities(config: DefaultWorldConfig): PhysicsEntity[] {
  const interactive: PhysicsEntity[] = [];

  return interactive;
}

/**
 * Generate structure plots positioned around the center of the map based on user's level config
 * Creates 7 plots in a pattern and loads structures from user's saved configuration
 */
async function createUserStructurePlots(config: DefaultWorldConfig): Promise<Structure[]> {
  const plots: Structure[] = [];

  // Calculate map center position
  const centerX = DESIGN_WIDTH / 2; // 960
  const centerY = DESIGN_HEIGHT / 2; // 540

  // Distance from center for the outer plots
  const plotDistance = 200; // pixels from center

  // Plot positions in a pattern (7 positions)
  const plotPositions = [
    new Vec2(centerX - plotDistance * 2, centerY + plotDistance * 0.5),
    new Vec2(centerX - plotDistance * 1.5, centerY - plotDistance * 0.5),
    new Vec2(centerX - plotDistance, centerY - plotDistance * 1.5),
    new Vec2(centerX, centerY - plotDistance * 1.5),
    new Vec2(centerX + plotDistance, centerY - plotDistance * 1.5),
    new Vec2(centerX + plotDistance * 1.5, centerY - plotDistance * 0.5),
    new Vec2(centerX + plotDistance * 2, centerY + plotDistance * 0.5),
  ];

  // Get the user level config
  let levelConfig = config.userLevelConfig;

  // If no config provided, try to load it
  if (!levelConfig && config.userId) {
    levelConfig = await loadUserLevelConfig(config.userId);
  }

  // Fallback to empty config if still no config
  if (!levelConfig) {
    levelConfig = ["empty", "empty", "empty", "empty", "empty", "empty", "empty"];
  }

  // Mouse interaction callbacks with save functionality
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

  // Create Structure objects for each position based on level config
  for (let i = 0; i < plotPositions.length && i < levelConfig.length; i++) {
    const position = plotPositions[i];
    const structureId = levelConfig[i];

    try {
      // Create structure based on ID from level config
      const plot = await createStructureById(structureId, position, onPlotMouseCallbacks);
      plots.push(plot);

      console.log(
        `Created plot ${i + 1} at position (${position.x}, ${
          position.y
        }) with structure: ${structureId}`
      );
    } catch (error) {
      console.error(`Failed to create plot ${i + 1} with structure ${structureId}:`, error);

      // Create empty structure as fallback
      try {
        const plot = await Structure.create(position, onPlotMouseCallbacks);
        plots.push(plot);
        console.log(`Created fallback empty plot ${i + 1}`);
      } catch (fallbackError) {
        console.error(`Failed to create fallback plot ${i + 1}:`, fallbackError);
      }
    }
  }

  return plots;
}

/**
 * Construct the default world with all initial entities and settings
 * This function should be called to set up a new player's world
 */
export async function constructDefaultWorld(
  pixiApp: PIXI.Application,
  worldContainer: PIXI.Container,
  userId?: string
): Promise<WorldPhysicsHandler> {
  // Create the world physics handler
  const worldHandler = new WorldPhysicsHandler(pixiApp, worldContainer);

  // Create the default configuration
  const config = createDefaultWorldConfig();
  config.userId = userId;

  // Set physics properties
  worldHandler.setGravity(config.physics.gravity);

  // Create entities (including async structure plots and baby cows)
  const decorations = createDecorationEntities(config);
  const interactive = createInteractiveEntities(config);
  const structurePlots = await createUserStructurePlots(config);
  const babyCows = await createBabyCowEntities(pixiApp, worldContainer);

  // Combine all entities
  config.entities = [...decorations, ...interactive, ...structurePlots, ...babyCows];

  // Add all entities to the world
  config.entities.forEach((entity) => {
    worldHandler.addEntity(entity);
  });

  console.log(
    `World constructed with ${worldHandler.getEntityCount()} entities for user: ${
      userId || "guest"
    }`
  );

  return worldHandler;
}

export default createDefaultWorldConfig;

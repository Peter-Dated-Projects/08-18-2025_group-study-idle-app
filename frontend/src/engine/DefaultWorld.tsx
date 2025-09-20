import { WorldPhysicsHandler } from "./WorldPhysicsHandler";
import { PhysicsEntity, Vec2 } from "./physics";
import * as PIXI from "pixi.js";

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
 * Construct the default world with all initial entities and settings
 * This function should be called to set up a new player's world
 */
export function constructDefaultWorld(
  pixiApp: PIXI.Application,
  worldContainer: PIXI.Container
): WorldPhysicsHandler {
  // Create the world physics handler
  const worldHandler = new WorldPhysicsHandler(pixiApp, worldContainer);

  // Create the default configuration
  const config = createDefaultWorldConfig();

  // Set physics properties
  worldHandler.setGravity(config.physics.gravity);

  // Create and add all entities
  config.entities = [...createDecorationEntities(config), ...createInteractiveEntities(config)];

  // Add all entities to the world
  [...config.entities].forEach((entity) => {
    worldHandler.addEntity(entity);
  });

  console.log(`Default world constructed with ${worldHandler.getEntityCount()} entities`);

  return worldHandler;
}

/**
 * Create a player entity with default properties
 */
export function createDefaultPlayer(spawnPosition?: Vec2): PhysicsEntity {
  const position = spawnPosition || new Vec2(100, 500);

  const player = PhysicsEntity.createDynamic(
    position,
    new Vec2(32, 48), // Player size
    1.0, // Mass
    "player"
  );

  player.addTag("player");
  player.addTag("controllable");

  // Player-specific physics
  player.friction = 0.8; // Higher friction for better control
  player.restitution = 0.1; // Low bounce
  player.drag = 0.05; // Some air resistance

  // Player appearance
  player.tint = 0x00ff00; // Green color for player

  return player;
}

/**
 * Get spawn positions for multiplayer scenarios
 */
export function getDefaultSpawnPositions(): Vec2[] {
  return [
    new Vec2(100, 500), // Spawn point 1
    new Vec2(200, 500), // Spawn point 2
    new Vec2(1700, 500), // Spawn point 3
    new Vec2(1800, 500), // Spawn point 4
  ];
}

/**
 * Create a simple test world for debugging
 */
export function constructTestWorld(
  pixiApp: PIXI.Application,
  worldContainer: PIXI.Container
): WorldPhysicsHandler {
  const worldHandler = new WorldPhysicsHandler(pixiApp, worldContainer);

  // Set simple bounds
  worldHandler.setWorldBounds(new Vec2(0, 0), new Vec2(800, 600));

  // Simple gravity
  worldHandler.setGravity(new Vec2(0, 500));

  // Just ground and a few test objects
  const ground = PhysicsEntity.createStatic(new Vec2(400, 580), new Vec2(800, 40), "test_ground");
  ground.addTag("ground");

  const testBox = PhysicsEntity.createDynamic(
    new Vec2(400, 300),
    new Vec2(50, 50),
    1.0,
    "test_box"
  );
  testBox.addTag("test");

  worldHandler.addEntity(ground);
  worldHandler.addEntity(testBox);

  console.log("Test world constructed");

  return worldHandler;
}

export default {
  constructDefaultWorld,
  createDefaultWorldConfig,
  createDefaultPlayer,
  getDefaultSpawnPositions,
  constructTestWorld,
};

import { WorldPhysicsHandler } from "./WorldPhysicsHandler";
import { PhysicsEntity, Vec2 } from "./physics";
import * as PIXI from "pixi.js";

/**
 * Default world configuration and initial state for new players
 */
export interface DefaultWorldConfig {
  // World boundaries
  worldBounds: {
    width: number;
    height: number;
    min: Vec2;
    max: Vec2;
  };

  // Physics settings
  physics: {
    gravity: Vec2;
    defaultFriction: number;
    defaultRestitution: number;
    defaultDrag: number;
  };

  // Initial entities
  entities: {
    ground: PhysicsEntity[];
    walls: PhysicsEntity[];
    decorations: PhysicsEntity[];
    interactive: PhysicsEntity[];
  };
}

/**
 * Create the default world configuration
 */
export function createDefaultWorldConfig(): DefaultWorldConfig {
  const worldWidth = 1920;
  const worldHeight = 1080;

  return {
    worldBounds: {
      width: worldWidth,
      height: worldHeight,
      min: new Vec2(0, 0),
      max: new Vec2(worldWidth, worldHeight),
    },

    physics: {
      gravity: new Vec2(0, 9.81 * 100), // 9.81 m/s² in pixels/s²
      defaultFriction: 0.1,
      defaultRestitution: 0.3,
      defaultDrag: 0.01,
    },

    entities: {
      ground: [],
      walls: [],
      decorations: [],
      interactive: [],
    },
  };
}

/**
 * Create ground entities for the default world
 */
function createGroundEntities(config: DefaultWorldConfig): PhysicsEntity[] {
  const ground: PhysicsEntity[] = [];

  // Main ground platform
  const mainGround = new PhysicsEntity(
    new Vec2(config.worldBounds.width / 2, config.worldBounds.height - 50),
    new Vec2(config.worldBounds.width, 100),
    "main_ground"
  );
  mainGround.isStatic = true;
  mainGround.mass = Infinity;
  mainGround.addTag("ground");
  mainGround.addTag("platform");
  ground.push(mainGround);

  // Small platforms for more interesting terrain
  const platform1 = new PhysicsEntity(
    new Vec2(300, config.worldBounds.height - 200),
    new Vec2(200, 30),
    "platform_1"
  );
  platform1.isStatic = true;
  platform1.mass = Infinity;
  platform1.addTag("ground");
  platform1.addTag("platform");
  ground.push(platform1);

  const platform2 = new PhysicsEntity(
    new Vec2(800, config.worldBounds.height - 300),
    new Vec2(150, 30),
    "platform_2"
  );
  platform2.isStatic = true;
  platform2.mass = Infinity;
  platform2.addTag("ground");
  platform2.addTag("platform");
  ground.push(platform2);

  const platform3 = new PhysicsEntity(
    new Vec2(1400, config.worldBounds.height - 250),
    new Vec2(180, 30),
    "platform_3"
  );
  platform3.isStatic = true;
  platform3.mass = Infinity;
  platform3.addTag("ground");
  platform3.addTag("platform");
  ground.push(platform3);

  return ground;
}

/**
 * Create wall entities for the default world
 */
function createWallEntities(config: DefaultWorldConfig): PhysicsEntity[] {
  const walls: PhysicsEntity[] = [];

  // Left wall
  const leftWall = PhysicsEntity.createStatic(
    new Vec2(-25, config.worldBounds.height / 2),
    new Vec2(50, config.worldBounds.height),
    "left_wall"
  );
  leftWall.addTag("wall");
  leftWall.addTag("boundary");
  walls.push(leftWall);

  // Right wall
  const rightWall = PhysicsEntity.createStatic(
    new Vec2(config.worldBounds.width + 25, config.worldBounds.height / 2),
    new Vec2(50, config.worldBounds.height),
    "right_wall"
  );
  rightWall.addTag("wall");
  rightWall.addTag("boundary");
  walls.push(rightWall);

  // Ceiling (invisible barrier)
  const ceiling = PhysicsEntity.createStatic(
    new Vec2(config.worldBounds.width / 2, -25),
    new Vec2(config.worldBounds.width, 50),
    "ceiling"
  );
  ceiling.addTag("wall");
  ceiling.addTag("boundary");
  ceiling.visible = false; // Invisible ceiling
  walls.push(ceiling);

  return walls;
}

/**
 * Create decorative entities for the default world
 */
function createDecorationEntities(config: DefaultWorldConfig): PhysicsEntity[] {
  const decorations: PhysicsEntity[] = [];

  // Trees
  const tree1 = PhysicsEntity.createStatic(
    new Vec2(150, config.worldBounds.height - 120),
    new Vec2(40, 140),
    "tree_1"
  );
  tree1.addTag("decoration");
  tree1.addTag("tree");
  decorations.push(tree1);

  const tree2 = PhysicsEntity.createStatic(
    new Vec2(1650, config.worldBounds.height - 120),
    new Vec2(40, 140),
    "tree_2"
  );
  tree2.addTag("decoration");
  tree2.addTag("tree");
  decorations.push(tree2);

  // Rocks
  const rock1 = PhysicsEntity.createStatic(
    new Vec2(500, config.worldBounds.height - 75),
    new Vec2(60, 50),
    "rock_1"
  );
  rock1.addTag("decoration");
  rock1.addTag("rock");
  decorations.push(rock1);

  const rock2 = PhysicsEntity.createStatic(
    new Vec2(1200, config.worldBounds.height - 75),
    new Vec2(80, 50),
    "rock_2"
  );
  rock2.addTag("decoration");
  rock2.addTag("rock");
  decorations.push(rock2);

  return decorations;
}

/**
 * Create interactive entities for the default world
 */
function createInteractiveEntities(config: DefaultWorldConfig): PhysicsEntity[] {
  const interactive: PhysicsEntity[] = [];

  // Collectible items
  const coin1 = PhysicsEntity.createDynamic(
    new Vec2(350, config.worldBounds.height - 250),
    new Vec2(20, 20),
    0.1,
    "coin_1"
  );
  coin1.addTag("collectible");
  coin1.addTag("coin");
  coin1.isStatic = true; // Make it static but mark as collectible
  coin1.tint = 0xffd700; // Gold color
  interactive.push(coin1);

  const coin2 = PhysicsEntity.createDynamic(
    new Vec2(850, config.worldBounds.height - 350),
    new Vec2(20, 20),
    0.1,
    "coin_2"
  );
  coin2.addTag("collectible");
  coin2.addTag("coin");
  coin2.isStatic = true;
  coin2.tint = 0xffd700;
  interactive.push(coin2);

  // Moveable boxes
  const box1 = PhysicsEntity.createDynamic(
    new Vec2(600, config.worldBounds.height - 150),
    new Vec2(50, 50),
    2.0,
    "box_1"
  );
  box1.addTag("interactive");
  box1.addTag("moveable");
  box1.friction = config.physics.defaultFriction;
  box1.restitution = 0.1; // Low bounce
  interactive.push(box1);

  const box2 = PhysicsEntity.createDynamic(
    new Vec2(1100, config.worldBounds.height - 150),
    new Vec2(40, 40),
    1.5,
    "box_2"
  );
  box2.addTag("interactive");
  box2.addTag("moveable");
  box2.friction = config.physics.defaultFriction;
  box2.restitution = 0.1;
  interactive.push(box2);

  // Bouncy balls
  const ball1 = PhysicsEntity.createDynamic(
    new Vec2(400, config.worldBounds.height - 200),
    new Vec2(30, 30),
    0.5,
    "ball_1"
  );
  ball1.addTag("interactive");
  ball1.addTag("bouncy");
  ball1.restitution = 0.8; // High bounce
  ball1.friction = 0.05; // Low friction
  ball1.tint = 0xff6b6b; // Red color
  interactive.push(ball1);

  const ball2 = PhysicsEntity.createDynamic(
    new Vec2(1300, config.worldBounds.height - 300),
    new Vec2(25, 25),
    0.4,
    "ball_2"
  );
  ball2.addTag("interactive");
  ball2.addTag("bouncy");
  ball2.restitution = 0.8;
  ball2.friction = 0.05;
  ball2.tint = 0x4ecdc4; // Teal color
  interactive.push(ball2);

  return interactive;
}

/**
 * Construct the default world with all initial entities and settings
 * This function should be called to set up a new player's world
 */
export function constructDefaultWorld(pixiApp: PIXI.Application): WorldPhysicsHandler {
  // Create the world physics handler
  const worldHandler = new WorldPhysicsHandler(pixiApp);

  // Create the default configuration
  const config = createDefaultWorldConfig();

  // Set world bounds
  worldHandler.setWorldBounds(config.worldBounds.min, config.worldBounds.max);

  // Set physics properties
  worldHandler.setGravity(config.physics.gravity);

  // Create and add all entities
  config.entities.ground = createGroundEntities(config);
  config.entities.walls = createWallEntities(config);
  config.entities.decorations = createDecorationEntities(config);
  config.entities.interactive = createInteractiveEntities(config);

  // Add all entities to the world
  [
    ...config.entities.ground,
    ...config.entities.walls,
    ...config.entities.decorations,
    ...config.entities.interactive,
  ].forEach((entity) => {
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
export function constructTestWorld(pixiApp: PIXI.Application): WorldPhysicsHandler {
  const worldHandler = new WorldPhysicsHandler(pixiApp);

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

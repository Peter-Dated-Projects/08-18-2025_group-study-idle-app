import { loadSpriteSheet, SpriteSheet } from "./SpriteSheet";
import { Rect } from "./utils";
import { loadJsonFile } from "./utils";
import { Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";

interface Tile {
  id: string;
  x: number;
  y: number;
  spriteSheetId?: string;
  scaleX?: number;
}

interface AnimatedTile extends Tile {
  animationFrames: string[]; // Array of tile IDs for animation frames
  frameDuration: number; // Duration per frame in milliseconds
  currentFrame: number; // Current frame index
  lastFrameTime: number; // Last time frame was updated
  sprite?: Sprite; // Reference to the sprite for updating texture
}

interface SpriteSheetDef {
  base64Data: string;
  tilewidth: number;
  tileheight: number;
}

interface Layer {
  name: string;
  tiles: (Tile | AnimatedTile)[];
  collider: boolean;
  container: Container;
}

interface Tilemap {
  file: string;
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
  layers: Layer[];
  spriteSheets: Map<string, SpriteSheet>;
  baseTextures: Map<string, Texture>;
  animatedTiles: AnimatedTile[]; // Track animated tiles for updates
  lastUpdateTime: number;
}

// Helper function to check if a tile is animated
function isAnimatedTile(tile: Tile | AnimatedTile): tile is AnimatedTile {
  return "animationFrames" in tile;
}

async function loadLevel(file: string, spriteSheetDef?: SpriteSheetDef): Promise<Tilemap> {
  const data = await loadJsonFile<any>(file);
  console.log("Loaded level data:", data);

  // Validate required fields
  if (!data.layers || !Array.isArray(data.layers)) {
    throw new Error(`Level file ${file} missing 'layers' array`);
  }

  // Build tilemap object
  const tilemap: Tilemap = {
    file,
    tileSize: data.tileSize || 16,
    mapWidth: data.mapWidth || 100,
    mapHeight: data.mapHeight || 100,
    layers: [],
    spriteSheets: new Map(),
    baseTextures: new Map(),
    animatedTiles: [],
    lastUpdateTime: performance.now(),
  };

  // Load the single spritesheet
  console.log("Loading spritesheet...");

  let spriteSheetPath: string;
  let spriteSheetConfig: SpriteSheetDef;

  if (spriteSheetDef) {
    // Use provided spritesheet definition
    spriteSheetPath = "provided";
    spriteSheetConfig = spriteSheetDef;
  } else if (data.spritesheet) {
    // Use spritesheet path from JSON - assume it's in the public folder
    spriteSheetPath = data.spritesheet;

    // For now, we need default tile dimensions - you might want to add these to your JSON
    spriteSheetConfig = {
      base64Data: `/${spriteSheetPath}`, // This will be loaded as a regular image path
      tilewidth: 16, // Default - you might want to add this to your JSON
      tileheight: 16, // Default - you might want to add this to your JSON
    };
  } else {
    throw new Error(`Level file ${file} missing spritesheet configuration`);
  }

  try {
    console.log(`Loading spritesheet from: ${spriteSheetConfig.base64Data}`);

    // Load texture from the path
    const texture = await Assets.load(spriteSheetConfig.base64Data);
    tilemap.baseTextures.set("default", texture);

    // Create spritesheet
    const spriteSheet = await loadSpriteSheet(
      spriteSheetConfig.base64Data,
      spriteSheetConfig.tilewidth,
      spriteSheetConfig.tileheight
    );
    tilemap.spriteSheets.set("default", spriteSheet);

    console.log(`✅ Loaded spritesheet with ${spriteSheet.tiles.length} tiles`);
  } catch (error) {
    console.error(`❌ Failed to load spritesheet:`, error);
    throw error;
  }

  // Get the default spritesheet for all tiles
  const defaultSpriteSheet = tilemap.spriteSheets.get("default");
  const defaultBaseTexture = tilemap.baseTextures.get("default");

  if (!defaultSpriteSheet || !defaultBaseTexture) {
    throw new Error("Failed to load default spritesheet");
  }

  // Process each layer - maintain original order for proper z-indexing
  for (let i = 0; i < data.layers.length; i++) {
    const layerData = data.layers[i];

    console.log(`Processing layer ${i}: ${layerData.name} with ${layerData.tiles.length} tiles`);

    // Create layer container
    const container = new Container();
    container.label = `Layer_${layerData.name}`;

    // Set zIndex - first layer in JSON should be on top (highest zIndex)
    container.zIndex = data.layers.length - i;
    container.sortableChildren = true;

    console.log(`Layer ${layerData.name} assigned zIndex: ${container.zIndex}`);

    // Process each tile in the layer
    let tilesAdded = 0;
    const layerTiles: (Tile | AnimatedTile)[] = [];

    for (const tileData of layerData.tiles) {
      const tile = tileData as Tile;

      // Skip tiles that don't have required properties
      if (!tile.id || tile.x === undefined || tile.y === undefined) {
        continue;
      }

      // Convert tile ID to number (0-indexed, so use directly as array index)
      const tileId = parseInt(tile.id, 10);

      if (isNaN(tileId)) {
        console.warn(`Invalid tile ID "${tile.id}" - not a number`);
        continue;
      }

      // Use tile ID directly as array index (0-indexed)
      const tileIndex = tileId;

      if (tileIndex < 0 || tileIndex >= defaultSpriteSheet.tiles.length) {
        console.warn(
          `Tile ID ${tileId} (index ${tileIndex}) out of bounds for spritesheet (has ${defaultSpriteSheet.tiles.length} tiles)`
        );
        continue;
      }

      const tileInfo = defaultSpriteSheet.tiles[tileIndex];
      // console.log(`Loading tile ID ${tileId} (index ${tileIndex}):`, tileInfo);

      // Create texture from the tile area
      const tileTexture = new Texture({
        source: defaultBaseTexture.source,
        frame: new Rectangle(
          tileInfo.area.x,
          tileInfo.area.y,
          tileInfo.area.width,
          tileInfo.area.height
        ),
      });

      const sprite = new Sprite(tileTexture);
      sprite.x = tile.x * tilemap.tileSize;
      sprite.y = tile.y * tilemap.tileSize;
      sprite.scale.x = tile.scaleX || 1;

      container.addChild(sprite);

      // Check if this is an animated tile
      if (isAnimatedTile(tile)) {
        const animTile = tile as AnimatedTile;
        animTile.sprite = sprite;
        animTile.currentFrame = 0;
        animTile.lastFrameTime = performance.now();
        tilemap.animatedTiles.push(animTile);
      }

      layerTiles.push(tile);
      tilesAdded++;
    }

    console.log(`Layer ${layerData.name}: Added ${tilesAdded} tiles to container`);

    const layer: Layer = {
      name: layerData.name,
      tiles: layerTiles,
      collider: layerData.collider || false,
      container,
    };

    tilemap.layers.push(layer);
  }

  console.log(
    `Loaded tilemap with ${tilemap.layers.length} layers and ${tilemap.animatedTiles.length} animated tiles`
  );
  return tilemap;
}

/**
 * Update animated tiles
 */
function updateAnimatedTiles(tilemap: Tilemap): void {
  const currentTime = performance.now();
  const deltaTime = currentTime - tilemap.lastUpdateTime;

  for (const animTile of tilemap.animatedTiles) {
    if (currentTime - animTile.lastFrameTime >= animTile.frameDuration) {
      // Advance to next frame
      animTile.currentFrame = (animTile.currentFrame + 1) % animTile.animationFrames.length;
      animTile.lastFrameTime = currentTime;

      // Update sprite texture
      if (animTile.sprite) {
        const newTileId = animTile.animationFrames[animTile.currentFrame];
        const tileId = parseInt(newTileId, 10);

        // Use tile ID directly as array index (0-indexed)
        const tileIndex = tileId;

        // Use the default spritesheet
        const spriteSheet = tilemap.spriteSheets.get("default");
        const baseTexture = tilemap.baseTextures.get("default");

        if (spriteSheet && baseTexture && tileIndex >= 0 && tileIndex < spriteSheet.tiles.length) {
          const tileInfo = spriteSheet.tiles[tileIndex];

          const newTexture = new Texture({
            source: baseTexture.source,
            frame: new Rectangle(
              tileInfo.area.x,
              tileInfo.area.y,
              tileInfo.area.width,
              tileInfo.area.height
            ),
          });

          animTile.sprite.texture = newTexture;
        }
      }
    }
  }

  tilemap.lastUpdateTime = currentTime;
}

/**
 * Create an animated tile
 */
function createAnimatedTile(
  baseId: string,
  x: number,
  y: number,
  animationFrames: string[],
  frameDurationMs: number = 500,
  spriteSheetId?: string
): AnimatedTile {
  return {
    id: baseId,
    x,
    y,
    spriteSheetId,
    animationFrames,
    frameDuration: frameDurationMs,
    currentFrame: 0,
    lastFrameTime: 0,
  };
}

/**
 * Add tilemap to a PIXI container
 */
function addTilemapToContainer(tilemap: Tilemap, parentContainer: Container) {
  for (const layer of tilemap.layers) {
    parentContainer.addChild(layer.container);
  }
}

/**
 * Remove tilemap from container and cleanup
 */
function removeTilemapFromContainer(tilemap: Tilemap, parentContainer: Container) {
  for (const layer of tilemap.layers) {
    if (layer.container.parent === parentContainer) {
      parentContainer.removeChild(layer.container);
    }
    layer.container.destroy({ children: true });
  }
  tilemap.layers.length = 0;
  tilemap.spriteSheets.clear();
  tilemap.baseTextures.clear();
  tilemap.animatedTiles.length = 0;
}

export type { Tile, AnimatedTile, Tilemap, Layer, SpriteSheetDef };
export {
  loadLevel,
  updateAnimatedTiles,
  createAnimatedTile,
  addTilemapToContainer,
  removeTilemapFromContainer,
};

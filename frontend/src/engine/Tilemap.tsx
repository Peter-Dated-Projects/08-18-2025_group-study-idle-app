import { loadSpriteSheet, SpriteSheet } from "./SpriteSheet";
import { Rect } from "./utils";
import { loadJsonFile } from "./utils";
import { Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";

interface Tile {
  id: string;
  x: number;
  y: number;
  spriteSheetId: string;
  scaleX: number;
}

interface SpriteSheetDef {
  // Changed from separate image/tilewidth/tileheight to base64 data URL
  base64Data: string;
  tilewidth: number;
  tileheight: number;
}

interface Layer {
  id: string;
  name: string;
  description: string;
  tiles: Tile[];
  collider: boolean;
  isAutoTile: boolean;
  rules: any[];
  container: Container;
}

interface Tilemap {
  file: string;
  width: number;
  height: number;
  layers: Layer[];
  spriteSheets: Map<string, SpriteSheet>;
  baseTextures: Map<string, Texture>;
}

async function loadLevel(file: string): Promise<Tilemap> {
  const data = await loadJsonFile<any>(file);
  console.log("Loaded level data:", data);

  // Validate required fields
  if (!data.spriteSheets || typeof data.spriteSheets !== "object") {
    throw new Error(`Level file ${file} missing 'spriteSheets' object`);
  }

  if (!data.layers || !Array.isArray(data.layers)) {
    throw new Error(`Level file ${file} missing 'layers' array`);
  }

  // Build tilemap object
  const tilemap: Tilemap = {
    file,
    width: data.width || 100, // Use defaults if not specified
    height: data.height || 100,
    layers: [],
    spriteSheets: new Map(),
    baseTextures: new Map(),
  };

  // Load all spritesheets from base64 data
  console.log("Loading spritesheets from base64 data...");
  for (const [sheetId, base64Data] of Object.entries(data.spriteSheets)) {
    const dataUrl = base64Data as string;

    try {
      // Load texture directly from base64 data URL
      const texture = await Assets.load(dataUrl);
      tilemap.baseTextures.set(sheetId, texture);

      // Create spritesheet using the tileSize from the data
      const tileSize = data.tileSize || 16;
      const spriteSheet = await loadSpriteSheet(dataUrl, tileSize, tileSize);
      tilemap.spriteSheets.set(sheetId, spriteSheet);

      console.log(`Loaded spritesheet ${sheetId} with ${spriteSheet.tiles.length} tiles`);
    } catch (error) {
      console.error(`Failed to load spritesheet ${sheetId}:`, error);
    }
  }

  // Process each layer - keep original order, set zIndex explicitly
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
    for (const tileData of layerData.tiles) {
      const tile = tileData as Tile;

      // Skip tiles that don't have required properties
      if (!tile.spriteSheetId || !tile.id || tile.x === undefined || tile.y === undefined) {
        continue;
      }

      // Get the spritesheet and base texture
      const spriteSheet = tilemap.spriteSheets.get(tile.spriteSheetId);
      const baseTexture = tilemap.baseTextures.get(tile.spriteSheetId);

      if (!spriteSheet || !baseTexture) {
        console.warn(`Spritesheet ${tile.spriteSheetId} not found for tile ${tile.id}`);
        continue;
      }

      // Convert tile ID to number and use as index
      const tileIndex = parseInt(tile.id, 10);

      if (tileIndex >= 0 && tileIndex < spriteSheet.tiles.length) {
        const tileInfo = spriteSheet.tiles[tileIndex];

        // Create texture from the tile area
        const tileTexture = new Texture({
          source: baseTexture.source,
          frame: new Rectangle(
            tileInfo.area.x,
            tileInfo.area.y,
            tileInfo.area.width,
            tileInfo.area.height
          ),
        });

        const sprite = new Sprite(tileTexture);
        sprite.x = tile.x;
        sprite.y = tile.y;
        sprite.scale.x = tile.scaleX || 1;

        container.addChild(sprite);
        tilesAdded++;
      }
    }

    console.log(`Layer ${layerData.name}: Added ${tilesAdded} tiles to container`);

    const layer: Layer = {
      id: layerData.id,
      name: layerData.name,
      description: layerData.description || "",
      tiles: layerData.tiles,
      collider: layerData.collider || false,
      isAutoTile: layerData.isAutoTile || false,
      rules: layerData.rules || [],
      container,
    };

    tilemap.layers.push(layer);
  }

  console.log(`Loaded tilemap with ${tilemap.layers.length} layers`);
  return tilemap;
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
}

export type { Tile, Tilemap, Layer, SpriteSheetDef };
export { loadLevel, addTilemapToContainer, removeTilemapFromContainer };

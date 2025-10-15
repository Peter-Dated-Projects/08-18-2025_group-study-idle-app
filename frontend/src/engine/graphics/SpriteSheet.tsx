import { Tile } from "./Tilemap";
import * as PIXI from "pixi.js";

interface SpriteSheet {
  file: string;
  tileWidth: number;
  tileHeight: number;
  tiles: Tile[];
}

// Global cache for processed spritesheets only
const spriteSheetCache = new Map<string, SpriteSheet>();

async function loadSpriteSheet(
  file: string,
  tileWidth: number,
  tileHeight: number
): Promise<SpriteSheet> {
  // Create a unique cache key
  const cacheKey = `${file}:${tileWidth}x${tileHeight}`;

  // Check if already cached
  if (spriteSheetCache.has(cacheKey)) {

    return spriteSheetCache.get(cacheKey)!;
  }

  // PIXI.Assets handles texture caching automatically
  const texture = await PIXI.Assets.load(file);

  const sheet: SpriteSheet = {
    file,
    tileWidth,
    tileHeight,
    tiles: [],
  };

  const cols = Math.floor(texture.width / tileWidth);
  const rows = Math.floor(texture.height / tileHeight);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      sheet.tiles.push({
        file,
        area: {
          x: x * tileWidth,
          y: y * tileHeight,
          width: tileWidth,
          height: tileHeight,
        },
      });
    }
  }

  // Cache the processed spritesheet
  spriteSheetCache.set(cacheKey, sheet);

  return sheet;
}

/**
 * Get a cached spritesheet if it exists
 */
function getCachedSpriteSheet(
  file: string,
  tileWidth: number,
  tileHeight: number
): SpriteSheet | null {
  const cacheKey = `${file}:${tileWidth}x${tileHeight}`;
  return spriteSheetCache.get(cacheKey) || null;
}

/**
 * Preload multiple spritesheets
 */
async function preloadSpriteSheets(
  sheets: Array<{ file: string; tileWidth: number; tileHeight: number }>
): Promise<Map<string, SpriteSheet>> {
  const loadPromises = sheets.map(({ file, tileWidth, tileHeight }) =>
    loadSpriteSheet(file, tileWidth, tileHeight).then((sheet) => ({
      key: `${file}:${tileWidth}x${tileHeight}`,
      sheet,
    }))
  );

  const results = await Promise.all(loadPromises);
  const loadedSheets = new Map<string, SpriteSheet>();

  results.forEach(({ key, sheet }) => {
    loadedSheets.set(key, sheet);
  });

  return loadedSheets;
}

/**
 * Clear spritesheet cache (textures are managed by PIXI.Assets)
 */
function clearSpriteSheetCache() {
  spriteSheetCache.clear();

}

/**
 * Get cache statistics
 */
function getSpriteSheetCacheStats() {
  return {
    spriteSheetsLoaded: spriteSheetCache.size,
    spriteSheetKeys: Array.from(spriteSheetCache.keys()),
  };
}

export type { SpriteSheet };
export {
  loadSpriteSheet,
  getCachedSpriteSheet,
  preloadSpriteSheets,
  clearSpriteSheetCache,
  getSpriteSheetCacheStats,
  spriteSheetCache,
};

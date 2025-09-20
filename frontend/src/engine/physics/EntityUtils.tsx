import * as PIXI from "pixi.js";
import { Assets } from "pixi.js";
import { Entity } from "./Entity";
import { Vec2 } from "./Vec2";

// Function to load texture with pixel art scale mode
export async function loadPixelTexture(filename: string): Promise<PIXI.Texture> {
  const texture = await Assets.load(filename);
  // For modern PIXI.js v8+, use the new scale mode API
  if (texture.source) {
    texture.source.scaleMode = "nearest";
  } else if (texture.baseTexture) {
    // Fallback for older PIXI versions
    texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
  }
  return texture;
}

// Helper function to create and add entity to world
export async function createAndAddEntity(
  container: PIXI.Container,
  entities: Entity[],
  filename: string,
  x: number,
  y: number,
  scale: number = 1,
  zIndex: number = 0
): Promise<Entity> {
  const texture = await loadPixelTexture(filename);
  const sprite = new PIXI.Sprite(texture);

  sprite.anchor.set(0.5);
  sprite.scale.set(scale);
  sprite.position.set(x, y);
  sprite.zIndex = zIndex;
  container.addChild(sprite);

  // Create entity with proper Vec2 objects
  const position = new Vec2(x, y);
  const size = new Vec2(texture.width * scale, texture.height * scale);
  const entity = new Entity(position, size);

  entities.push(entity);
  return entity;
}

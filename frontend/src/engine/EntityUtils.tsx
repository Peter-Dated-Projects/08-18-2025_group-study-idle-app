import * as PIXI from "pixi.js";
import { Assets } from "pixi.js";
import { Entity } from "./Entity";
import { Rect } from "./Rect";

// Function to load texture with pixel art scale mode
export async function loadPixelTexture(filename: string): Promise<PIXI.Texture> {
  const texture = await Assets.load(filename);
  texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
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

  const entity = new Entity(sprite, {
    position: { x, y },
    area: { width: texture.width * scale, height: texture.height * scale },
    velocity: { x: 0, y: 0 },
  });

  entities.push(entity);
  return entity;
}

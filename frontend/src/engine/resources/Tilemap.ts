import * as PIXI from "pixi.js";

export interface Tile {
  file: string;
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AnimatedTile {
  id: string;
  x: number;
  y: number;
  currentFrame: number;
  lastFrameTime: number;
  frameDuration: number;
  animationFrames: string[];
  sprite?: PIXI.Sprite;
}

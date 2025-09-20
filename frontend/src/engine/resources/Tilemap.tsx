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
  currentFrame: number;
  lastFrameTime: number;
  frameDuration: number;
  animationFrames: number[];
  sprite?: PIXI.Sprite;
}

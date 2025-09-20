import * as PIXI from "pixi.js";
import { v4 as uuidv4 } from "uuid";
import { Rect } from "./Rect";

export class Entity {
  public id: string;
  public sprite: PIXI.Sprite;
  public rect: Rect;
  public isChanged: boolean = false;

  constructor(sprite: PIXI.Sprite, rect: Rect) {
    this.id = uuidv4();
    this.sprite = sprite;
    this.rect = rect;
  }

  public update(deltaTime: number): void {
    // Store previous position to check for changes
    const prevX = this.rect.position.x;
    const prevY = this.rect.position.y;

    // Update position based on velocity
    this.rect.position.x += this.rect.velocity.x * deltaTime;
    this.rect.position.y += this.rect.velocity.y * deltaTime;

    // Check if position changed
    if (this.rect.position.x !== prevX || this.rect.position.y !== prevY) {
      this.isChanged = true;
    }

    // Update sprite position to match rect position
    this.sprite.position.set(this.rect.position.x, this.rect.position.y);
  }

  public setPosition(x: number, y: number): void {
    // Check if position actually changed
    if (this.rect.position.x !== x || this.rect.position.y !== y) {
      this.isChanged = true;
    }

    this.rect.position.x = x;
    this.rect.position.y = y;
    this.sprite.position.set(x, y);
  }

  public setVelocity(vx: number, vy: number): void {
    this.rect.velocity.x = vx;
    this.rect.velocity.y = vy;
  }

  public resetChanged(): void {
    this.isChanged = false;
  }
}

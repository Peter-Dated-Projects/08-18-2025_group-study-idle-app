import { Entity } from "./Entity";
import { Rect } from "./Rect";
import * as PIXI from "pixi.js";

export class Rigidbody extends Entity {
  public maxSpeed: number;

  constructor(sprite: PIXI.Sprite, rect: Rect, maxSpeed: number = 200) {
    super(sprite, rect);
    this.maxSpeed = maxSpeed; // pixels per second
  }

  public update(deltaTime: number): void {
    // Clamp velocity to max speed
    const speed = Math.sqrt(this.rect.velocity.x ** 2 + this.rect.velocity.y ** 2);
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.rect.velocity.x *= scale;
      this.rect.velocity.y *= scale;
    }

    // Call parent update to handle position and sprite updates via velocity
    super.update(deltaTime);
  }

  public setVelocity(vx: number, vy: number): void {
    this.rect.velocity.x = vx;
    this.rect.velocity.y = vy;
    this.isChanged = true;
  }

  public setMaxSpeed(speed: number): void {
    this.maxSpeed = speed;
  }

  public stop(): void {
    this.rect.velocity.x = 0;
    this.rect.velocity.y = 0;
    this.isChanged = true;
  }

  public moveTowards(targetX: number, targetY: number, speed: number): void {
    const dx = targetX - this.rect.position.x;
    const dy = targetY - this.rect.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1) {
      // Avoid division by zero
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      this.setVelocity(normalizedX * speed, normalizedY * speed);
    } else {
      this.stop();
    }
  }
}

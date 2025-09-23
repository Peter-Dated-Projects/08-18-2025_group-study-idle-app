import { Entity } from "./Entity";
import * as PIXI from "pixi.js";
import Vec2 from "./Vec2";

export class Rigidbody extends Entity {
  public maxSpeed: number;

  constructor(sprite: PIXI.Sprite, size: Vec2, maxSpeed: number = 200) {
    super(sprite, size);
    this.maxSpeed = maxSpeed; // pixels per second
  }

  public update(): void {
    // Clamp velocity to max speed
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
    }

    // Call parent update to handle position and sprite updates via velocity
    super.update();
  }

  public setVelocity(vx: number, vy: number): void {
    this.velocity.x = vx;
    this.velocity.y = vy;
    this.isChanged = true;
  }

  public setMaxSpeed(speed: number): void {
    this.maxSpeed = speed;
  }

  public stop(): void {
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.isChanged = true;
  }

  public moveTowards(targetX: number, targetY: number, speed: number): void {
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
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

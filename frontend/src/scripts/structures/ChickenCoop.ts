import { Vec2 } from "../../engine/physics";
import { Structure } from "./Structure";
import * as PIXI from "pixi.js";

/**
 * ChickenCoop structure - houses chickens and produces eggs
 * Provides animal husbandry functionality
 */
export class ChickenCoop extends Structure {
  private chickenCoopTexturePath = "/entities/house_chicken.png";
  private maxChickens = 6;
  private currentChickens = 0;
  private eggProductionRate = 1; // eggs per hour per chicken

  constructor(position: Vec2, onClick?: (structure: ChickenCoop) => void) {
    super(position, onClick ? (structure) => onClick(structure as ChickenCoop) : undefined);

    // Add chicken coop-specific tags
    this.addTag("chicken-coop");
    this.addTag("animal-housing");
    this.addTag("production");
    this.addTag("farm-building");
  }

  /**
   * Override sprite initialization to use chicken coop texture
   */
  public async initializeSprite(): Promise<void> {
    try {
      // Load the chicken coop texture
      const texture = await PIXI.Assets.load(this.chickenCoopTexturePath);

      // Create sprite
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit appropriate size for chicken coop (larger than mailbox)
      const scaleX = 178 / texture.width;
      const scaleY = 178 / texture.height;
      this.sprite.scale.set(scaleX, scaleY);

      // Position sprite
      this.sprite.position.set(this.position.x, this.position.y);

      // Enable interactivity
      this.sprite.interactive = true;
      this.sprite.cursor = "pointer";

      // Set up click event
      this.sprite.on("pointerdown", this.handleClick.bind(this));

      // Set pixel-perfect rendering
      texture.source.scaleMode = "nearest";
    } catch (error) {
      console.error("Failed to initialize ChickenCoop sprite:", error);
      // Fall back to base structure sprite if chicken coop texture fails
      await super.initializeSprite();
    }
  }

  /**
   * Handle chicken coop-specific click interactions
   */
  protected handleClick(event: PIXI.FederatedPointerEvent): void {
    // Call parent click handler first
    super.handleClick(event);

    // Add chicken coop-specific click behavior
    this.inspectCoop();
  }

  /**
   * Inspect the chicken coop
   */
  public inspectCoop(): void {
    console.log(`Chicken Coop Status:`);
    console.log(`- Chickens: ${this.currentChickens}/${this.maxChickens}`);
    console.log(`- Eggs available: ${this.getEggCount()}`);
    console.log(`- Production rate: ${this.eggProductionRate} eggs/hour/chicken`);
  }

  /**
   * Add chickens to the coop
   */
  public addChickens(count: number): boolean {
    if (this.currentChickens + count <= this.maxChickens) {
      this.currentChickens += count;
      return true;
    } else {
      return false;
    }
  }

  /**
   * Remove chickens from the coop
   */
  public removeChickens(count: number): boolean {
    if (this.currentChickens >= count) {
      this.currentChickens -= count;
      return true;
    } else {
      return false;
    }
  }

  /**
   * Collect eggs from the coop
   */
  public collectEggs(): number {
    const eggCount = this.getEggCount();
    // Reset egg production timer here in a real implementation
    return eggCount;
  }

  /**
   * Get current egg count (placeholder logic)
   */
  public getEggCount(): number {
    // Simplified egg production - in a real game this would be time-based
    return Math.floor(this.currentChickens * this.eggProductionRate * Math.random());
  }

  /**
   * Get coop capacity info
   */
  public getCapacityInfo(): { current: number; max: number; available: number } {
    return {
      current: this.currentChickens,
      max: this.maxChickens,
      available: this.maxChickens - this.currentChickens,
    };
  }

  /**
   * Check if coop is full
   */
  public isFull(): boolean {
    return this.currentChickens >= this.maxChickens;
  }

  /**
   * Check if coop is empty
   */
  public isEmpty(): boolean {
    return this.currentChickens === 0;
  }

  /**
   * Static factory method to create a ChickenCoop with automatic sprite initialization
   */
  public static async create(
    position: Vec2,
    onClick?: (chickenCoop: ChickenCoop) => void
  ): Promise<ChickenCoop> {
    const chickenCoop = new ChickenCoop(position, onClick);
    await chickenCoop.initializeSprite();
    return chickenCoop;
  }
}

export default ChickenCoop;

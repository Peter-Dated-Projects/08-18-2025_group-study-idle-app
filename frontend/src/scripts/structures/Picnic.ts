import { Vec2 } from "../../engine/physics";
import { Structure } from "./Structure";
import * as PIXI from "pixi.js";

/**
 * Picnic structure - a relaxation and social area
 * Provides rest and social interaction functionality
 */
export class Picnic extends Structure {
  private picnicTexturePath = "/entities/picnic.png";
  private maxSeats = 4;
  private currentVisitors = 0;
  private restBonus = 10; // energy restored per rest session

  constructor(position: Vec2, onClick?: (structure: Picnic) => void) {
    super(position, onClick ? (structure) => onClick(structure as Picnic) : undefined);

    // Add picnic-specific tags
    this.addTag("picnic");
    this.addTag("social");
    this.addTag("recreation");
    this.addTag("rest-area");
  }

  /**
   * Override sprite initialization to use picnic texture
   */
  public async initializeSprite(): Promise<void> {
    try {
      // Load the picnic texture
      const texture = await PIXI.Assets.load(this.picnicTexturePath);

      // Create sprite
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit appropriate size for picnic area
      const scaleX = 176 / texture.width;
      const scaleY = 176 / texture.height;
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

      console.log(`Picnic sprite initialized at position (${this.position.x}, ${this.position.y})`);
    } catch (error) {
      console.error("Failed to initialize Picnic sprite:", error);
      // Fall back to base structure sprite if picnic texture fails
      await super.initializeSprite();
    }
  }

  /**
   * Handle picnic-specific click interactions
   */
  protected handleClick(event: PIXI.FederatedPointerEvent): void {
    // Call parent click handler first
    super.handleClick(event);

    // Add picnic-specific click behavior
    this.usePicnicArea();
  }

  /**
   * Use the picnic area for rest and relaxation
   */
  public usePicnicArea(): void {
    if (this.currentVisitors < this.maxSeats) {
      this.currentVisitors++;
      console.log(`Using picnic area for rest. Visitors: ${this.currentVisitors}/${this.maxSeats}`);
      console.log(`Restored ${this.restBonus} energy!`);

      // Simulate rest session - in real game this would take time
      setTimeout(() => {
        this.finishRest();
      }, 2000); // 2 second rest simulation
    } else {
      console.log("Picnic area is full! Please wait for a seat to become available.");
    }
  }

  /**
   * Finish rest session
   */
  private finishRest(): void {
    if (this.currentVisitors > 0) {
      this.currentVisitors--;
      console.log(
        `Rest session complete! Feeling refreshed. Available seats: ${
          this.maxSeats - this.currentVisitors
        }`
      );
    }
  }

  /**
   * Host a social gathering
   */
  public hostGathering(): boolean {
    if (this.currentVisitors === 0) {
      console.log("Hosting a social gathering at the picnic area!");
      this.currentVisitors = this.maxSeats; // Fill all seats

      // Simulate gathering duration
      setTimeout(() => {
        this.endGathering();
      }, 5000); // 5 second gathering simulation

      return true;
    } else {
      console.log("Cannot host gathering - picnic area is currently in use.");
      return false;
    }
  }

  /**
   * End social gathering
   */
  private endGathering(): void {
    this.currentVisitors = 0;
    console.log("Social gathering has ended. Picnic area is now available!");
  }

  /**
   * Check availability
   */
  public getAvailability(): { available: number; occupied: number; total: number } {
    return {
      available: this.maxSeats - this.currentVisitors,
      occupied: this.currentVisitors,
      total: this.maxSeats,
    };
  }

  /**
   * Check if picnic area is available
   */
  public isAvailable(): boolean {
    return this.currentVisitors < this.maxSeats;
  }

  /**
   * Check if picnic area is full
   */
  public isFull(): boolean {
    return this.currentVisitors >= this.maxSeats;
  }

  /**
   * Get current mood/atmosphere of the picnic area
   */
  public getMood(): string {
    if (this.currentVisitors === 0) return "peaceful and quiet";
    if (this.currentVisitors === this.maxSeats) return "lively and bustling";
    return "pleasantly occupied";
  }

  /**
   * Static factory method to create a Picnic with automatic sprite initialization
   */
  public static async create(position: Vec2, onClick?: (picnic: Picnic) => void): Promise<Picnic> {
    const picnic = new Picnic(position, onClick);
    await picnic.initializeSprite();
    return picnic;
  }
}

export default Picnic;

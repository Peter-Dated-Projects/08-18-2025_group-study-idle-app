import { Vec2 } from "../../engine/physics";
import { MouseInteractionCallbacks, Structure } from "./Structure";
import * as PIXI from "pixi.js";

import { CHICKEN_COOP_CONFIG } from "@/config/structureConfigs";

/**
 * ChickenCoop structure - houses chickens and produces eggs
 * Provides animal husbandry functionality
 */
export class ChickenCoop extends Structure {
  private maxChickens = 6;
  private currentChickens = 0;
  private eggProductionRate = 1; // eggs per hour per chicken

  constructor(position: Vec2, mouseCallbacks: MouseInteractionCallbacks) {
    super(position, mouseCallbacks);

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
    // change the actual sprite
    try {
      const texture = await PIXI.Assets.load(CHICKEN_COOP_CONFIG.image);
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit appropriate size for chicken coop
      const scaleX = CHICKEN_COOP_CONFIG.width / texture.width;
      const scaleY = CHICKEN_COOP_CONFIG.height / texture.height;
      this.sprite.scale.set(scaleX, scaleY);

      // Position sprite
      this.sprite.position.set(this.position.x, this.position.y);

      // Set z-index based on bottom of chicken coop structure
      const halfHeight = CHICKEN_COOP_CONFIG.height / 2;
      const bottomY = this.position.y + halfHeight;
      this.sprite.zIndex = bottomY;

      // Enable interactivity
      this.sprite.interactive = true;
      this.sprite.cursor = "pointer";

      // Set up click event
      this.sprite.on("pointerdown", this.handleClick.bind(this));

      // Set up hover events for white border effect
      this.sprite.on("pointerover", this.handleHoverEnter.bind(this));
      this.sprite.on("pointerout", this.handleHoverExit.bind(this));

      // Set pixel-perfect rendering
      texture.source.scaleMode = "nearest";
    } catch (error) {
      console.error("Error loading chicken coop texture:", error);
    }
  }

  /**
   * Static factory method to create a ChickenCoop with automatic sprite initialization
   */
  public static async create(
    position: Vec2,
    mouseCallbacks: MouseInteractionCallbacks
  ): Promise<ChickenCoop> {
    const chickenCoop = new ChickenCoop(position, mouseCallbacks);
    await chickenCoop.initializeSprite();
    return chickenCoop;
  }
}

export default ChickenCoop;

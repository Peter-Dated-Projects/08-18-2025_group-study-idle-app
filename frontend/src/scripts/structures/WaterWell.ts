import { Vec2 } from "../../engine/physics";
import { MouseInteractionCallbacks, Structure } from "./Structure";
import { callGlobalStructureClickHandler } from "../../utils/globalStructureHandler";
import * as PIXI from "pixi.js";

import { WATER_WELL_CONFIG } from "@/config/structureConfigs";

/**
 * WaterWell structure - provides water supply for the farm
 * Essential utility for irrigation and farming operations
 */
export class WaterWell extends Structure {
  private maxWaterCapacity = 1000; // liters
  private currentWaterLevel = 800; // starts with some water
  private waterRegenRate = 10; // liters per minute
  private lastRegenTime = Date.now();

  constructor(position: Vec2, mouseCallbacks: MouseInteractionCallbacks) {
    super(position, mouseCallbacks);
    // Add water well-specific tags
    this.addTag("water-well");
    this.addTag("utility");
    this.addTag("water-source");
    this.addTag("essential");
  }

  /**
   * Override sprite initialization to use water well texture
   */
  public async initializeSprite(): Promise<void> {
    // change the actual sprite
    try {
      const texture = await PIXI.Assets.load(WATER_WELL_CONFIG.image);
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit appropriate size for water well
      const scaleX = WATER_WELL_CONFIG.width / texture.width;
      const scaleY = WATER_WELL_CONFIG.height / texture.height;
      this.sprite.scale.set(scaleX, scaleY);

      // Position sprite
      this.sprite.position.set(this.position.x, this.position.y);

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
      console.error("Error loading water well texture:", error);
    }
  }

  /**
   * Static factory method to create a WaterWell with automatic sprite initialization
   */
  public static async create(
    position: Vec2,
    mouseCallbacks: MouseInteractionCallbacks
  ): Promise<WaterWell> {
    const waterWell = new WaterWell(position, mouseCallbacks);
    await waterWell.initializeSprite();
    return waterWell;
  }
}

export default WaterWell;

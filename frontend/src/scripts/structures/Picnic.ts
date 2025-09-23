import { Vec2 } from "../../engine/physics";
import { MouseInteractionCallbacks, Structure } from "./Structure";
import * as PIXI from "pixi.js";

import { PICNIC_CONFIG } from "@/config/structureConfigs";

/**
 * Picnic structure - a relaxation and social area
 * Provides rest and social interaction functionality
 */
export class Picnic extends Structure {
  private maxSeats = 4;
  private currentVisitors = 0;
  private restBonus = 10; // energy restored per rest session

  constructor(position: Vec2, mouseCallbacks: MouseInteractionCallbacks) {
    super(position, mouseCallbacks);

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
    // change the actual sprite
    try {
      const texture = await PIXI.Assets.load(PICNIC_CONFIG.image);
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit appropriate size for picnic
      const scaleX = PICNIC_CONFIG.width / texture.width;
      const scaleY = PICNIC_CONFIG.height / texture.height;
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
      console.error("Error loading picnic texture:", error);
    }
  }

  /**
   * Static factory method to create a Picnic with automatic sprite initialization
   */
  public static async create(
    position: Vec2,
    mouseCallbacks: MouseInteractionCallbacks
  ): Promise<Picnic> {
    const picnic = new Picnic(position, mouseCallbacks);
    await picnic.initializeSprite();
    return picnic;
  }
}

export default Picnic;

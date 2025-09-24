import { Vec2 } from "../../engine/physics";
import { MouseInteractionCallbacks, Structure } from "./Structure";
import * as PIXI from "pixi.js";

import { MAILBOX_CONFIG } from "@/config/structureConfigs";

/**
 * Mailbox structure - a communication hub for the farm
 * Provides mail delivery and messaging functionality
 */
export class Mailbox extends Structure {
  constructor(position: Vec2, mouseCallbacks: MouseInteractionCallbacks) {
    super(position, mouseCallbacks);

    // Add mailbox-specific tags
    this.addTag("mailbox");
    this.addTag("communication");
    this.addTag("utility");
  }

  /**
   * Override sprite initialization to use mailbox texture
   */
  public async initializeSprite(): Promise<void> {
    // change the actual sprite
    try {
      const texture = await PIXI.Assets.load(MAILBOX_CONFIG.image);
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit appropriate size for mailbox
      const scaleX = MAILBOX_CONFIG.width / texture.width;
      const scaleY = MAILBOX_CONFIG.height / texture.height;
      this.sprite.scale.set(scaleX, scaleY);

      // Position sprite
      this.sprite.position.set(this.position.x, this.position.y);

      // Set z-index based on bottom of mailbox structure
      const halfHeight = MAILBOX_CONFIG.height / 2;
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
      console.error("Error loading mailbox texture:", error);
    }
  }

  /**
   * Static factory method to create a Mailbox with automatic sprite initialization
   */
  public static async create(
    position: Vec2,
    mouseCallbacks: MouseInteractionCallbacks
  ): Promise<Mailbox> {
    const mailbox = new Mailbox(position, mouseCallbacks);
    await mailbox.initializeSprite();
    return mailbox;
  }
}

export default Mailbox;

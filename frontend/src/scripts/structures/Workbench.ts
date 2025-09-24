import { Vec2 } from "../../engine/physics";
import { MouseInteractionCallbacks, Structure } from "./Structure";
import * as PIXI from "pixi.js";

import { WORKBENCH_CONFIG } from "@/config/structureConfigs";

/**
 * Workbench structure - a crafting and tool creation station
 * Provides crafting and item creation functionality
 */
export class Workbench extends Structure {
  private maxCraftingSlots = 3;
  private currentProjects = 0;
  private availableRecipes: string[] = [
    "Basic Tools",
    "Farm Equipment",
    "Building Materials",
    "Decorative Items",
  ];

  constructor(position: Vec2, mouseCallbacks: MouseInteractionCallbacks) {
    super(position, mouseCallbacks);
    // Add workbench-specific tags
    this.addTag("workbench");
    this.addTag("crafting");
    this.addTag("production");
    this.addTag("tools");
  }

  /**
   * Override sprite initialization to use workbench texture
   */
  public async initializeSprite(): Promise<void> {
    // change the actual sprite
    try {
      const texture = await PIXI.Assets.load(WORKBENCH_CONFIG.image);
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit appropriate size for workbench
      const scaleX = WORKBENCH_CONFIG.width / texture.width;
      const scaleY = WORKBENCH_CONFIG.height / texture.height;
      this.sprite.scale.set(scaleX, scaleY);

      // Position sprite
      this.sprite.position.set(this.position.x, this.position.y);

      // Set z-index based on bottom of workbench structure
      const halfHeight = WORKBENCH_CONFIG.height / 2;
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
      console.error("Error loading workbench texture:", error);
    }
  }

  /**
   * Static factory method to create a Workbench with automatic sprite initialization
   */
  public static async create(
    position: Vec2,
    mouseCallbacks: MouseInteractionCallbacks
  ): Promise<Workbench> {
    const workbench = new Workbench(position, mouseCallbacks);
    await workbench.initializeSprite();
    return workbench;
  }
}

export default Workbench;

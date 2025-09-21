import { Vec2 } from "../../engine/physics";
import { Structure } from "./Structure";
import * as PIXI from "pixi.js";

/**
 * Workbench structure - a crafting and tool creation station
 * Provides crafting and item creation functionality
 */
export class Workbench extends Structure {
  private workbenchTexturePath = "/entities/work-station.png";
  private maxCraftingSlots = 3;
  private currentProjects = 0;
  private availableRecipes: string[] = [
    "Basic Tools",
    "Farm Equipment",
    "Building Materials",
    "Decorative Items",
  ];

  constructor(position: Vec2, onClick?: (structure: Workbench) => void) {
    super(position, onClick ? (structure) => onClick(structure as Workbench) : undefined);

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
    try {
      // Load the workbench texture
      const texture = await PIXI.Assets.load(this.workbenchTexturePath);

      // Create sprite
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit appropriate size for workbench
      const scaleX = 100 / texture.width;
      const scaleY = 100 / texture.height;
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

      console.log(
        `Workbench sprite initialized at position (${this.position.x}, ${this.position.y})`
      );
    } catch (error) {
      console.error("Failed to initialize Workbench sprite:", error);
      // Fall back to base structure sprite if workbench texture fails
      await super.initializeSprite();
    }
  }

  /**
   * Handle workbench-specific click interactions
   */
  protected handleClick(event: PIXI.FederatedPointerEvent): void {
    // Call parent click handler first
    super.handleClick(event);

    // Add workbench-specific click behavior
    this.openCraftingMenu();
  }

  /**
   * Open the crafting menu
   */
  public openCraftingMenu(): void {
    console.log("Opening workbench crafting menu...");
    console.log(
      `Available crafting slots: ${this.maxCraftingSlots - this.currentProjects}/${
        this.maxCraftingSlots
      }`
    );
    console.log("Available recipes:", this.availableRecipes);
  }

  /**
   * Start crafting an item
   */
  public startCrafting(recipe: string, materials: string[]): boolean {
    if (this.currentProjects >= this.maxCraftingSlots) {
      console.log("Workbench is at full capacity! Please wait for current projects to finish.");
      return false;
    }

    if (!this.availableRecipes.includes(recipe)) {
      console.log(`Recipe "${recipe}" is not available at this workbench.`);
      return false;
    }

    this.currentProjects++;
    console.log(`Started crafting "${recipe}" using materials: ${materials.join(", ")}`);
    console.log(`Crafting slots used: ${this.currentProjects}/${this.maxCraftingSlots}`);

    // Simulate crafting time
    const craftingTime = this.getCraftingTime(recipe);
    setTimeout(() => {
      this.finishCrafting(recipe);
    }, craftingTime);

    return true;
  }

  /**
   * Finish crafting an item
   */
  private finishCrafting(recipe: string): void {
    if (this.currentProjects > 0) {
      this.currentProjects--;
      console.log(`Finished crafting "${recipe}"! Item added to inventory.`);
      console.log(
        `Available crafting slots: ${this.maxCraftingSlots - this.currentProjects}/${
          this.maxCraftingSlots
        }`
      );
    }
  }

  /**
   * Get crafting time for a recipe (in milliseconds)
   */
  private getCraftingTime(recipe: string): number {
    const craftingTimes: { [key: string]: number } = {
      "Basic Tools": 3000, // 3 seconds
      "Farm Equipment": 5000, // 5 seconds
      "Building Materials": 4000, // 4 seconds
      "Decorative Items": 2000, // 2 seconds
    };
    return craftingTimes[recipe] || 3000;
  }

  /**
   * Add a new recipe to the workbench
   */
  public learnRecipe(recipe: string): boolean {
    if (this.availableRecipes.includes(recipe)) {
      console.log(`Recipe "${recipe}" is already known.`);
      return false;
    }

    this.availableRecipes.push(recipe);
    console.log(`Learned new recipe: "${recipe}"`);
    return true;
  }

  /**
   * Get current workbench status
   */
  public getStatus(): {
    projectsInProgress: number;
    availableSlots: number;
    totalSlots: number;
    availableRecipes: string[];
  } {
    return {
      projectsInProgress: this.currentProjects,
      availableSlots: this.maxCraftingSlots - this.currentProjects,
      totalSlots: this.maxCraftingSlots,
      availableRecipes: [...this.availableRecipes],
    };
  }

  /**
   * Check if workbench is available for new projects
   */
  public isAvailable(): boolean {
    return this.currentProjects < this.maxCraftingSlots;
  }

  /**
   * Check if workbench is at full capacity
   */
  public isAtCapacity(): boolean {
    return this.currentProjects >= this.maxCraftingSlots;
  }

  /**
   * Cancel a crafting project (if needed)
   */
  public cancelProject(): boolean {
    if (this.currentProjects > 0) {
      this.currentProjects--;
      console.log("Cancelled crafting project. Materials may be lost.");
      return true;
    }
    return false;
  }

  /**
   * Static factory method to create a Workbench with automatic sprite initialization
   */
  public static async create(
    position: Vec2,
    onClick?: (workbench: Workbench) => void
  ): Promise<Workbench> {
    const workbench = new Workbench(position, onClick);
    await workbench.initializeSprite();
    return workbench;
  }
}

export default Workbench;

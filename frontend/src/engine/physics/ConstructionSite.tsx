import { Entity } from "./Entity";
import { Vec2 } from "./Vec2";
import { AABBCollider } from "./AABBCollider";

/**
 * ConstructionSite - A specialized entity representing a building construction site
 * Extends the base Entity class with construction-specific properties
 */
export class ConstructionSite extends Entity {
  // Construction-specific properties
  public constructionProgress: number = 0; // 0-100%
  public constructionType: string = "unknown";
  public constructionCost: number = 0;
  public isUnderConstruction: boolean = false;
  public completionTime: number = 0; // Time in seconds to complete construction
  public remainingTime: number = 0; // Remaining time to complete construction

  // Visual properties
  public blueprintVisible: boolean = true;
  public scaffoldingVisible: boolean = false;

  // Construction state
  public canStartConstruction: boolean = true;
  public hasRequiredResources: boolean = false;

  constructor(
    position: Vec2 = new Vec2(),
    size: Vec2 = new Vec2(64, 64),
    constructionType: string = "basic",
    id?: string
  ) {
    super();

    // Set basic entity properties
    this.position = new Vec2(position.x, position.y);
    this.id = id || `construction_site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set up collider
    this.collider = new AABBCollider(this.position, size);

    // Make construction sites static by default
    this.isStatic = true;
    this.mass = Infinity;

    // Set construction-specific properties
    this.constructionType = constructionType;
    this.setConstructionDefaults(constructionType);

    // Add relevant tags
    this.addTag("construction_site");
    this.addTag("structure");
    this.addTag("static");

    // Visual properties
    this.visible = true;
    this.tint = 0xcccccc; // Slightly grayed out to indicate construction
  }

  /**
   * Set default values based on construction type
   */
  private setConstructionDefaults(type: string): void {
    switch (type) {
      case "house":
        this.constructionCost = 100;
        this.completionTime = 30; // 30 seconds
        break;
      case "farm":
        this.constructionCost = 75;
        this.completionTime = 20;
        break;
      case "workshop":
        this.constructionCost = 150;
        this.completionTime = 45;
        break;
      case "storage":
        this.constructionCost = 50;
        this.completionTime = 15;
        break;
      case "basic":
      default:
        this.constructionCost = 25;
        this.completionTime = 10;
        break;
    }
    this.remainingTime = this.completionTime;
  }

  /**
   * Start construction on this site
   */
  public startConstruction(): boolean {
    if (!this.canStartConstruction || this.isUnderConstruction) {
      return false;
    }

    this.isUnderConstruction = true;
    this.scaffoldingVisible = true;
    this.remainingTime = this.completionTime;
    this.constructionProgress = 0;
    this.addTag("under_construction");

    return true;
  }

  /**
   * Update construction progress (call this every frame/update)
   */
  public updateConstruction(deltaTime: number): void {
    if (!this.isUnderConstruction) return;

    this.remainingTime -= deltaTime;
    this.constructionProgress = Math.min(
      100,
      ((this.completionTime - this.remainingTime) / this.completionTime) * 100
    );

    // Check if construction is complete
    if (this.remainingTime <= 0) {
      this.completeConstruction();
    }
  }

  /**
   * Complete the construction
   */
  public completeConstruction(): void {
    this.isUnderConstruction = false;
    this.constructionProgress = 100;
    this.remainingTime = 0;
    this.scaffoldingVisible = false;
    this.blueprintVisible = false;
    this.tint = 0xffffff; // Reset to normal color

    this.removeTag("under_construction");
    this.addTag("completed");

  }

  /**
   * Cancel construction and reset to initial state
   */
  public cancelConstruction(): void {
    this.isUnderConstruction = false;
    this.constructionProgress = 0;
    this.remainingTime = this.completionTime;
    this.scaffoldingVisible = false;
    this.blueprintVisible = true;
    this.tint = 0xcccccc;

    this.removeTag("under_construction");
    this.removeTag("completed");

  }

  /**
   * Check if construction can be started
   */
  public canStart(): boolean {
    return this.canStartConstruction && !this.isUnderConstruction && this.hasRequiredResources;
  }

  /**
   * Get construction progress as a percentage
   */
  public getProgressPercentage(): number {
    return Math.round(this.constructionProgress);
  }

  /**
   * Get remaining construction time in seconds
   */
  public getRemainingTime(): number {
    return Math.max(0, this.remainingTime);
  }

  /**
   * Set whether the site has required resources for construction
   */
  public setHasResources(hasResources: boolean): void {
    this.hasRequiredResources = hasResources;
  }

  /**
   * Get a description of the construction site
   */
  public getDescription(): string {
    const status = this.isUnderConstruction
      ? `Under construction (${this.getProgressPercentage()}%)`
      : this.constructionProgress === 100
      ? "Completed"
      : "Ready to build";

    return `${this.constructionType} - ${status}`;
  }

  /**
   * Create a default construction site at specified position
   */
  public static createDefault(x: number = 0, y: number = 0): ConstructionSite {
    return new ConstructionSite(new Vec2(x, y), new Vec2(64, 64), "basic");
  }

  /**
   * Create a construction site of specific type at specified position
   */
  public static create(
    x: number,
    y: number,
    type: string,
    size: Vec2 = new Vec2(64, 64)
  ): ConstructionSite {
    return new ConstructionSite(new Vec2(x, y), size, type);
  }
}

export default ConstructionSite;

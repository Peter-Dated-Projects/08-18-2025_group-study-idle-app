import { Vec2 } from "../../engine/physics";
import { Structure } from "./Structure";
import * as PIXI from "pixi.js";

/**
 * WaterWell structure - provides water supply for the farm
 * Essential utility for irrigation and farming operations
 */
export class WaterWell extends Structure {
  private waterWellTexturePath = "/entities/water_well.png";
  private maxWaterCapacity = 1000; // liters
  private currentWaterLevel = 800; // starts with some water
  private waterRegenRate = 10; // liters per minute
  private lastRegenTime = Date.now();

  constructor(position: Vec2, onClick?: (structure: WaterWell) => void) {
    super(position, onClick ? (structure) => onClick(structure as WaterWell) : undefined);

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
    try {
      // Load the water well texture
      const texture = await PIXI.Assets.load(this.waterWellTexturePath);

      // Create sprite
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit appropriate size for water well
      const scaleX = 156 / texture.width;
      const scaleY = 156 / texture.height;
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
        `WaterWell sprite initialized at position (${this.position.x}, ${this.position.y})`
      );
    } catch (error) {
      console.error("Failed to initialize WaterWell sprite:", error);
      // Fall back to base structure sprite if water well texture fails
      await super.initializeSprite();
    }
  }

  /**
   * Handle water well-specific click interactions
   */
  protected handleClick(event: PIXI.FederatedPointerEvent): void {
    // Call parent click handler first
    super.handleClick(event);

    // Add water well-specific click behavior
    this.checkWaterLevel();
  }

  /**
   * Check and display current water level
   */
  public checkWaterLevel(): void {
    this.updateWaterLevel(); // Update water level based on time passed
    const percentage = Math.round((this.currentWaterLevel / this.maxWaterCapacity) * 100);

    console.log(`Water Well Status:`);
    console.log(
      `- Water Level: ${this.currentWaterLevel}/${this.maxWaterCapacity} liters (${percentage}%)`
    );
    console.log(`- Regeneration Rate: ${this.waterRegenRate} liters/minute`);

    if (this.currentWaterLevel < 200) {
      console.log(
        "⚠️ Water level is low! Consider upgrading the well or waiting for regeneration."
      );
    } else if (this.currentWaterLevel >= this.maxWaterCapacity) {
      console.log("💧 Water well is at full capacity!");
    }
  }

  /**
   * Draw water from the well
   */
  public drawWater(amount: number): number {
    this.updateWaterLevel(); // Update water level first

    const availableWater = Math.min(amount, this.currentWaterLevel);
    this.currentWaterLevel -= availableWater;

    console.log(
      `Drew ${availableWater} liters of water. Remaining: ${this.currentWaterLevel} liters`
    );
    return availableWater;
  }

  /**
   * Upgrade the well capacity
   */
  public upgradeCapacity(additionalCapacity: number): boolean {
    const upgradeCost = additionalCapacity * 2; // 2 resources per liter capacity
    console.log(
      `Upgrading well capacity by ${additionalCapacity} liters (Cost: ${upgradeCost} resources)`
    );

    this.maxWaterCapacity += additionalCapacity;
    console.log(`Well capacity upgraded! New capacity: ${this.maxWaterCapacity} liters`);
    return true;
  }

  /**
   * Upgrade the regeneration rate
   */
  public upgradeRegenRate(additionalRate: number): boolean {
    const upgradeCost = additionalRate * 5; // 5 resources per liter/minute
    console.log(
      `Upgrading regeneration rate by ${additionalRate} liters/minute (Cost: ${upgradeCost} resources)`
    );

    this.waterRegenRate += additionalRate;
    console.log(`Regeneration rate upgraded! New rate: ${this.waterRegenRate} liters/minute`);
    return true;
  }

  /**
   * Update water level based on time passed (natural regeneration)
   */
  private updateWaterLevel(): void {
    const currentTime = Date.now();
    const timePassed = (currentTime - this.lastRegenTime) / (1000 * 60); // minutes

    if (timePassed > 0) {
      const waterGenerated = timePassed * this.waterRegenRate;
      this.currentWaterLevel = Math.min(
        this.maxWaterCapacity,
        this.currentWaterLevel + waterGenerated
      );
      this.lastRegenTime = currentTime;
    }
  }

  /**
   * Get detailed well statistics
   */
  public getWellStats(): {
    currentWater: number;
    maxCapacity: number;
    regenRate: number;
    waterPercentage: number;
    timeToFull: number; // minutes
  } {
    this.updateWaterLevel();
    const timeToFull =
      this.waterRegenRate > 0
        ? (this.maxWaterCapacity - this.currentWaterLevel) / this.waterRegenRate
        : 0;

    return {
      currentWater: this.currentWaterLevel,
      maxCapacity: this.maxWaterCapacity,
      regenRate: this.waterRegenRate,
      waterPercentage: (this.currentWaterLevel / this.maxWaterCapacity) * 100,
      timeToFull: Math.max(0, timeToFull),
    };
  }

  /**
   * Check if well has enough water for a specific amount
   */
  public hasWater(amount: number): boolean {
    this.updateWaterLevel();
    return this.currentWaterLevel >= amount;
  }

  /**
   * Check if well is empty
   */
  public isEmpty(): boolean {
    this.updateWaterLevel();
    return this.currentWaterLevel <= 0;
  }

  /**
   * Check if well is full
   */
  public isFull(): boolean {
    this.updateWaterLevel();
    return this.currentWaterLevel >= this.maxWaterCapacity;
  }

  /**
   * Get water quality status
   */
  public getWaterQuality(): string {
    const percentage = (this.currentWaterLevel / this.maxWaterCapacity) * 100;

    if (percentage >= 80) return "Excellent";
    if (percentage >= 60) return "Good";
    if (percentage >= 40) return "Fair";
    if (percentage >= 20) return "Poor";
    return "Critical";
  }

  /**
   * Perform maintenance on the well
   */
  public performMaintenance(): void {
    console.log("Performing maintenance on the water well...");
    // Boost regeneration temporarily or restore some water
    const maintenanceBonus = 50;
    this.currentWaterLevel = Math.min(
      this.maxWaterCapacity,
      this.currentWaterLevel + maintenanceBonus
    );
    console.log(`Maintenance complete! Added ${maintenanceBonus} liters of water.`);
  }

  /**
   * Static factory method to create a WaterWell with automatic sprite initialization
   */
  public static async create(
    position: Vec2,
    onClick?: (waterWell: WaterWell) => void
  ): Promise<WaterWell> {
    const waterWell = new WaterWell(position, onClick);
    await waterWell.initializeSprite();
    return waterWell;
  }
}

export default WaterWell;

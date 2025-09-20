import * as PIXI from "pixi.js";

/**
 * DynamicFPSManager - Manages different FPS presets for performance optimization
 * Allows switching between different frame rates based on application state
 */
export class DynamicFPSManager {
  private pixiApp: PIXI.Application;
  private fpsPresets: Map<string, number>;
  private currentPreset: string;
  private isEnabled: boolean = true;

  constructor(pixiApp: PIXI.Application) {
    this.pixiApp = pixiApp;
    this.fpsPresets = new Map();
    this.currentPreset = "default";
    this.setupDefaultPresets();
  }

  /**
   * Set up default FPS presets
   */
  private setupDefaultPresets(): void {
    this.fpsPresets.set("idle", 6); // Low FPS when idle
    this.fpsPresets.set("active", 24); // High FPS when interacting
  }

  /**
   * Add or update an FPS preset
   * @param presetName - Name of the preset
   * @param fps - Target FPS value
   */
  public setFPSPreset(presetName: string, fps: number): void {
    if (fps <= 0) {
      console.warn(`Invalid FPS value: ${fps}. FPS must be greater than 0.`);
      return;
    }

    this.fpsPresets.set(presetName, fps);
    console.log(`FPS preset '${presetName}' set to ${fps} FPS`);
  }

  /**
   * Switch to a specific FPS preset
   * @param presetName - Name of the preset to switch to
   */
  public switchToPreset(presetName: string): void {
    if (!this.fpsPresets.has(presetName)) {
      console.warn(
        `FPS preset '${presetName}' not found. Available presets:`,
        Array.from(this.fpsPresets.keys())
      );
      return;
    }

    if (!this.isEnabled) {
      console.log(`FPS manager is disabled. Cannot switch to preset '${presetName}'.`);
      return;
    }

    const targetFPS = this.fpsPresets.get(presetName)!;
    this.currentPreset = presetName;

    // Set the PIXI ticker target FPS
    this.pixiApp.ticker.maxFPS = targetFPS;

    console.log(
      `✅ Switched to FPS preset '${presetName}' (${targetFPS} FPS) - ticker.maxFPS updated`
    );
  }

  /**
   * Get the current FPS preset name
   */
  public getCurrentPreset(): string {
    return this.currentPreset;
  }

  /**
   * Get the current target FPS
   */
  public getCurrentFPS(): number {
    return this.fpsPresets.get(this.currentPreset) || 30;
  }

  /**
   * Get the actual current FPS from the PIXI ticker
   */
  public getActualFPS(): number {
    return this.pixiApp.ticker.FPS;
  }

  /**
   * Get detailed FPS information for debugging
   */
  public getFPSInfo(): {
    currentPreset: string;
    targetFPS: number;
    actualFPS: number;
    tickerMaxFPS: number;
    tickerMinFPS: number;
  } {
    return {
      currentPreset: this.currentPreset,
      targetFPS: this.getCurrentFPS(),
      actualFPS: this.getActualFPS(),
      tickerMaxFPS: this.pixiApp.ticker.maxFPS,
      tickerMinFPS: this.pixiApp.ticker.minFPS,
    };
  }

  /**
   * Get all available FPS presets
   */
  public getAvailablePresets(): { [key: string]: number } {
    const presets: { [key: string]: number } = {};
    this.fpsPresets.forEach((fps, name) => {
      presets[name] = fps;
    });
    return presets;
  }

  /**
   * Enable the FPS manager
   */
  public enable(): void {
    this.isEnabled = true;
    this.switchToPreset(this.currentPreset); // Reapply current preset
    console.log("Dynamic FPS Manager enabled");
  }

  /**
   * Disable the FPS manager (reverts to PIXI default)
   */
  public disable(): void {
    this.isEnabled = false;
    this.pixiApp.ticker.maxFPS = 0; // 0 means no limit (PIXI default)
    console.log("Dynamic FPS Manager disabled");
  }

  /**
   * Check if the FPS manager is enabled
   */
  public isManagerEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Remove an FPS preset
   * @param presetName - Name of the preset to remove
   */
  public removePreset(presetName: string): boolean {
    if (presetName === this.currentPreset) {
      console.warn(
        `Cannot remove current preset '${presetName}'. Switch to a different preset first.`
      );
      return false;
    }

    const removed = this.fpsPresets.delete(presetName);
    if (removed) {
      console.log(`FPS preset '${presetName}' removed`);
    } else {
      console.warn(`FPS preset '${presetName}' not found`);
    }
    return removed;
  }
}

/**
 * Global FPS manager instance
 */
export let fpsManager: DynamicFPSManager | null = null;

/**
 * Initialize the global FPS manager
 * @param pixiApp - The PIXI application instance
 */
export function initializeFPSManager(pixiApp: PIXI.Application): void {
  if (fpsManager) {
    console.log("FPS Manager already initialized, replacing with new instance");
  }

  fpsManager = new DynamicFPSManager(pixiApp);
  fpsManager.switchToPreset("idle"); // Start with idle preset (6 FPS)
  console.log("Dynamic FPS Manager initialized and set to idle FPS");
}

/**
 * Switch to a specific FPS preset using the global manager
 * @param presetName - Name of the preset to switch to
 */
export function switchFPSPreset(presetName: string): void {
  if (!fpsManager) {
    console.warn("FPS Manager not initialized. Call initializeFPSManager first.");
    return;
  }

  fpsManager.switchToPreset(presetName);
}

/**
 * Get the current FPS preset name
 */
export function getCurrentFPSPreset(): string {
  if (!fpsManager) {
    console.warn("FPS Manager not initialized.");
    return "unknown";
  }

  return fpsManager.getCurrentPreset();
}

/**
 * Get all available FPS presets
 */
export function getAvailableFPSPresets(): { [key: string]: number } {
  if (!fpsManager) {
    console.warn("FPS Manager not initialized.");
    return {};
  }

  return fpsManager.getAvailablePresets();
}

/**
 * Get detailed FPS information for debugging
 */
export function getFPSInfo(): any {
  if (!fpsManager) {
    console.warn("FPS Manager not initialized.");
    return null;
  }

  return fpsManager.getFPSInfo();
}

import * as PIXI from "pixi.js";
import { PhysicsEntity } from "../physics";

/**
 * Abstract base class for all entity renderers
 * Contains overridable onRender method that must be implemented by subclasses
 */
export abstract class BaseRenderer {
  protected pixiApp: PIXI.Application | null = null;
  protected worldContainer: PIXI.Container | null = null;
  protected debugMode: boolean = false;
  protected isInitialized: boolean = false;

  /**
   * Initialize the renderer with PIXI application and world container
   */
  initialize(pixiApp: PIXI.Application, worldContainer: PIXI.Container): void {
    this.pixiApp = pixiApp;
    this.worldContainer = worldContainer;
    this.isInitialized = true;
    this.onInitialize();
  }

  /**
   * Override this method to implement custom initialization logic
   */
  protected onInitialize(): void {
    // Default implementation does nothing
  }

  /**
   * Main render method that calls the overridable onRender method
   * This method must be overridden in subclasses
   */
  render(entity: PhysicsEntity): void {
    if (!this.isInitialized) {
      console.warn(`Renderer not initialized for entity ${entity.id}`);
      return;
    }

    this.onRender(entity);
  }

  /**
   * Abstract method that must be implemented by subclasses
   * This is where the actual rendering logic goes
   */
  protected abstract onRender(entity: PhysicsEntity): void;

  /**
   * Update method called each frame
   * Override this for frame-based updates
   */
  update(deltaTime: number): void {
    if (!this.isInitialized) return;
    this.onUpdate(deltaTime);
  }

  /**
   * Override this method to implement custom update logic
   */
  protected onUpdate(deltaTime: number): void {
    // Default implementation does nothing
  }

  /**
   * Set debug mode for this renderer
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.onDebugModeChanged(enabled);
  }

  /**
   * Override this method to handle debug mode changes
   */
  protected onDebugModeChanged(enabled: boolean): void {
    // Default implementation does nothing
  }

  /**
   * Get debug mode state
   */
  getDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * Check if renderer is initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Destroy the renderer and clean up resources
   */
  destroy(): void {
    this.onDestroy();
    this.pixiApp = null;
    this.worldContainer = null;
    this.isInitialized = false;
  }

  /**
   * Override this method to implement custom cleanup logic
   */
  protected onDestroy(): void {
    // Default implementation does nothing
  }

  /**
   * Get the PIXI application (protected access for subclasses)
   */
  protected getPixiApp(): PIXI.Application | null {
    return this.pixiApp;
  }

  /**
   * Get the world container (protected access for subclasses)
   */
  protected getWorldContainer(): PIXI.Container | null {
    return this.worldContainer;
  }
}
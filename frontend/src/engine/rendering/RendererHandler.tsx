import * as PIXI from "pixi.js";
import { BaseRenderer } from "./BaseRenderer";
import { PhysicsEntity } from "../physics";

/**
 * Main rendering coordinator that manages all rendering operations
 * Handles calls to render entities and manages the relationship between entities and their renderers
 */
export class RendererHandler {
  private pixiApp: PIXI.Application;
  private worldContainer: PIXI.Container;
  private entityRenderers: Map<string, BaseRenderer> = new Map();
  private debugMode: boolean = false;

  constructor(pixiApp: PIXI.Application, worldContainer: PIXI.Container) {
    this.pixiApp = pixiApp;
    this.worldContainer = worldContainer;
  }

  /**
   * Register a renderer for a specific entity
   */
  registerRenderer(entityId: string, renderer: BaseRenderer): void {
    // Remove existing renderer if it exists
    if (this.entityRenderers.has(entityId)) {
      this.removeRenderer(entityId);
    }

    this.entityRenderers.set(entityId, renderer);
    renderer.initialize(this.pixiApp, this.worldContainer);
  }

  /**
   * Remove a renderer for a specific entity
   */
  removeRenderer(entityId: string): void {
    const renderer = this.entityRenderers.get(entityId);
    if (renderer) {
      renderer.destroy();
      this.entityRenderers.delete(entityId);
    }
  }

  /**
   * Update and render a specific entity
   */
  renderEntity(entity: PhysicsEntity): void {
    const renderer = this.entityRenderers.get(entity.id);
    if (renderer) {
      renderer.render(entity);
    }
  }

  /**
   * Update and render all registered entities
   */
  renderAll(entities: PhysicsEntity[]): void {
    entities.forEach(entity => {
      this.renderEntity(entity);
    });
  }

  /**
   * Set debug mode for all renderers
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.entityRenderers.forEach(renderer => {
      renderer.setDebugMode(enabled);
    });
  }

  /**
   * Get debug mode state
   */
  getDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * Get renderer for specific entity
   */
  getRenderer(entityId: string): BaseRenderer | undefined {
    return this.entityRenderers.get(entityId);
  }

  /**
   * Get all registered renderers
   */
  getAllRenderers(): Map<string, BaseRenderer> {
    return new Map(this.entityRenderers);
  }

  /**
   * Clear all renderers
   */
  clearAll(): void {
    this.entityRenderers.forEach(renderer => {
      renderer.destroy();
    });
    this.entityRenderers.clear();
  }

  /**
   * Update all renderers (call this each frame)
   */
  update(deltaTime: number): void {
    this.entityRenderers.forEach(renderer => {
      renderer.update(deltaTime);
    });
  }

  /**
   * Get rendering statistics
   */
  getStats(): { rendererCount: number; debugMode: boolean } {
    return {
      rendererCount: this.entityRenderers.size,
      debugMode: this.debugMode
    };
  }
}
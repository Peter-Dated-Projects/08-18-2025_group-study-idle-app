import * as PIXI from "pixi.js";
import { Entity } from "./physics/Entity";
import { Vec2 } from "./physics/Vec2";
import { timeManager } from "./TimeManager";
import { RendererHandler, BaseRenderer } from "./rendering";
import { resetClickState } from "./input/MouseHandler";

/**
 * World Physics Handler - manages all entities and their physics simulation
 * Instantiated with PixiJS and handles updating all child entities each frame
 */
export class WorldPhysicsHandler {
  private entities: Map<string, Entity>;
  private entitiesArray: Entity[]; // For efficient iteration
  private pixiApp: PIXI.Application;
  private isRunning: boolean;
  private gravity: Vec2;
  private worldBounds: { min: Vec2; max: Vec2 } | null;
  private rendererHandler: RendererHandler;

  // Performance tracking
  private lastUpdateTime: number;
  private frameCount: number;
  private averageFPS: number;

  constructor(pixiApp: PIXI.Application, worldContainer: PIXI.Container) {
    this.entities = new Map();
    this.entitiesArray = [];
    this.pixiApp = pixiApp;
    this.isRunning = false;
    this.gravity = new Vec2(0, 9.81 * 100); // 9.81 m/s² converted to pixels/s²
    this.worldBounds = null;

    this.lastUpdateTime = performance.now();
    this.frameCount = 0;
    this.averageFPS = 0;

    // Initialize the rendering system
    this.rendererHandler = new RendererHandler(pixiApp, worldContainer);

    // Set up mouse event listeners for interaction system
    this.setupMouseEventListeners();

    // Start the update loop
    this.start();
  }

  /**
   * Add an entity to the physics simulation
   */
  public addEntity(entity: Entity): void {
    if (this.entities.has(entity.id)) {
      console.warn(`Entity with ID ${entity.id} already exists in world`);
      return;
    }

    this.entities.set(entity.id, entity);
    this.entitiesArray.push(entity);
  }

  /**
   * Remove an entity from the physics simulation
   */
  public removeEntity(entityId: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return false;
    }

    this.entities.delete(entityId);
    const index = this.entitiesArray.indexOf(entity);
    if (index > -1) {
      this.entitiesArray.splice(index, 1);
    }

    return true;
  }

  /**
   * Remove an entity by reference
   */
  public removeEntityByReference(entity: Entity): boolean {
    return this.removeEntity(entity.id);
  }

  /**
   * Get an entity by ID
   */
  public getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Get all entities
   */
  public getAllEntities(): Entity[] {
    return [...this.entitiesArray];
  }

  /**
   * Get entities by tag
   */
  public getEntitiesByTag(tag: string): Entity[] {
    return this.entitiesArray.filter((entity) => entity.hasTag(tag));
  }

  /**
   * Get entities within a radius of a position
   */
  public getEntitiesInRadius(position: Vec2, radius: number): Entity[] {
    const radiusSquared = radius * radius;
    return this.entitiesArray.filter(
      (entity) => entity.position.distanceSquaredTo(position) <= radiusSquared
    );
  }

  /**
   * Clear all entities from the simulation
   */
  public clearAllEntities(): void {
    this.entities.clear();
    this.entitiesArray.length = 0;
  }

  /**
   * Set world gravity
   */
  public setGravity(gravity: Vec2): void {
    this.gravity.set(gravity.x, gravity.y);
  }

  /**
   * Get world gravity
   */
  public getGravity(): Vec2 {
    return this.gravity.clone();
  }

  /**
   * Set world bounds for entity constraint
   */
  public setWorldBounds(min: Vec2, max: Vec2): void {
    this.worldBounds = { min: min.clone(), max: max.clone() };
  }

  /**
   * Remove world bounds
   */
  public removeWorldBounds(): void {
    this.worldBounds = null;
  }

  /**
   * Start the physics simulation
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.pixiApp.ticker.add(this.update, this);
  }

  /**
   * Stop the physics simulation
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.pixiApp.ticker.remove(this.update, this);
  }

  /**
   * Main update loop - called every frame by PixiJS ticker
   */
  private update = (): void => {
    if (!this.isRunning) return;

    // Update time manager
    timeManager.update();
    const deltaTime = timeManager.getDeltaTime();

    // Update performance tracking
    this.updatePerformanceStats();

    // Apply gravity to dynamic entities
    this.applyGravity(deltaTime);

    // Update all entities
    this.updateEntities(deltaTime);

    // Handle collisions
    this.handleCollisions();

    // Constrain entities to world bounds
    this.constrainToWorldBounds();

    // Clean up inactive entities
    this.cleanupInactiveEntities();

    // Update and render all entities
    this.rendererHandler.update(deltaTime);
    this.rendererHandler.renderAll(this.entitiesArray);

    // Reset mouse click state at the end of the frame
    resetClickState();
  };

  /**
   * Apply gravity to all dynamic entities
   */
  private applyGravity(deltaTime: number): void {
    for (const entity of this.entitiesArray) {
      if (!entity.isStatic && entity.isActive && entity.mass > 0) {
        entity.applyForce(Vec2.multiply(this.gravity, entity.mass));
      }
    }
  }

  /**
   * Update all entities
   */
  private updateEntities(deltaTime: number): void {
    for (const entity of this.entitiesArray) {
      if (entity.isActive) {
        entity.update();
      }
    }
  }

  /**
   * Handle collisions between entities
   */
  private handleCollisions(): void {
    // Simple O(n²) collision detection - can be optimized with spatial partitioning later
    for (let i = 0; i < this.entitiesArray.length; i++) {
      const entityA = this.entitiesArray[i];
      if (!entityA.isActive || !entityA.collider) continue;

      for (let j = i + 1; j < this.entitiesArray.length; j++) {
        const entityB = this.entitiesArray[j];
        if (!entityB.isActive || !entityB.collider) continue;

        // Skip collision if both entities are static
        if (entityA.isStatic && entityB.isStatic) continue;

        if (entityA.isCollidingWith(entityB)) {
          entityA.resolveCollision(entityB);
        }
      }
    }
  }

  /**
   * Constrain entities to world bounds
   */
  private constrainToWorldBounds(): void {
    if (!this.worldBounds) return;

    for (const entity of this.entitiesArray) {
      if (!entity.isActive || !entity.collider) continue;

      const { min, max } = this.worldBounds;
      const pos = entity.position;
      const halfSize = entity.collider.halfSize;

      // Constrain position
      const constrainedX = Math.max(min.x + halfSize.x, Math.min(pos.x, max.x - halfSize.x));
      const constrainedY = Math.max(min.y + halfSize.y, Math.min(pos.y, max.y - halfSize.y));

      // If position was constrained, update entity and handle bounce
      if (constrainedX !== pos.x || constrainedY !== pos.y) {
        entity.setPosition(new Vec2(constrainedX, constrainedY));

        // Bounce off walls
        if (constrainedX !== pos.x) {
          entity.velocity.x *= -entity.restitution;
        }
        if (constrainedY !== pos.y) {
          entity.velocity.y *= -entity.restitution;
        }
      }
    }
  }

  /**
   * Remove inactive entities from simulation
   */
  private cleanupInactiveEntities(): void {
    const activeEntities = this.entitiesArray.filter((entity) => entity.isActive);

    if (activeEntities.length !== this.entitiesArray.length) {
      // Rebuild maps and arrays
      this.entities.clear();
      this.entitiesArray = activeEntities;

      for (const entity of activeEntities) {
        this.entities.set(entity.id, entity);
      }
    }
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(): void {
    this.frameCount++;
    const currentTime = performance.now();

    // Update average FPS every 60 frames
    if (this.frameCount % 60 === 0) {
      const deltaMs = currentTime - this.lastUpdateTime;
      this.averageFPS = 60000 / deltaMs; // 60 frames * 1000ms
      this.lastUpdateTime = currentTime;
    }
  }

  /**
   * Get the number of entities in the simulation
   */
  public getEntityCount(): number {
    return this.entitiesArray.length;
  }

  /**
   * Get current FPS
   */
  public getFPS(): number {
    return timeManager.getFPS();
  }

  /**
   * Get average FPS over the last 60 frames
   */
  public getAverageFPS(): number {
    return this.averageFPS;
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    entityCount: number;
    currentFPS: number;
    averageFPS: number;
    deltaTime: number;
  } {
    return {
      entityCount: this.getEntityCount(),
      currentFPS: this.getFPS(),
      averageFPS: this.getAverageFPS(),
      deltaTime: timeManager.getDeltaTime(),
    };
  }

  /**
   * Destroy the physics handler and clean up resources
   */
  public destroy(): void {
    this.stop();
    this.clearAllEntities();
  }

  /**
   * Get world bounds
   */
  public getWorldBounds(): { min: Vec2; max: Vec2 } | null {
    return this.worldBounds
      ? {
          min: this.worldBounds.min.clone(),
          max: this.worldBounds.max.clone(),
        }
      : null;
  }

  /**
   * Pause the physics simulation
   */
  public pause(): void {
    this.isRunning = false;
  }

  /**
   * Resume the physics simulation
   */
  public resume(): void {
    this.isRunning = true;
    timeManager.reset(); // Reset time to prevent large delta jumps
  }

  /**
   * Check if the simulation is running
   */
  public isSimulationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Check if any entities have changes that need visual updates
   */
  public hasChanges(): boolean {
    return this.entitiesArray.some((entity) => entity.isChanged);
  }

  /**
   * Reset all entity change flags after processing visual updates
   */
  public resetAllChanges(): void {
    this.entitiesArray.forEach((entity) => entity.resetChanged());
  }

  /**
   * Get the renderer handler for direct access
   */
  public getRendererHandler(): RendererHandler {
    return this.rendererHandler;
  }

  /**
   * Register a renderer for a specific entity
   */
  public registerEntityRenderer(entityId: string, renderer: BaseRenderer): void {
    this.rendererHandler.registerRenderer(entityId, renderer);
  }

  /**
   * Remove a renderer for a specific entity
   */
  public removeEntityRenderer(entityId: string): void {
    this.rendererHandler.removeRenderer(entityId);
  }

  /**
   * Set debug mode for all renderers
   */
  public setDebugMode(enabled: boolean): void {
    this.rendererHandler.setDebugMode(enabled);
  }

  /**
   * Set up mouse event listeners for the interaction system
   */
  private setupMouseEventListeners(): void {
    const canvas = this.pixiApp.canvas;
    if (!canvas) return;
  }
}

export default WorldPhysicsHandler;

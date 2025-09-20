import * as PIXI from "pixi.js";
import { Vec2 } from "../physics/Vec2";
import { fpsManager } from "./DynamicFPSManager";

/**
 * MouseHandler state interface for consolidated state management
 */
interface MouseHandlerState {
  // Activity states
  isActive: boolean;
  isMouseInsideCanvas: boolean;
  isWindowFocused: boolean;
  isDocumentVisible: boolean;
  isMouseIdle: boolean;

  // Visual settings
  showVisualIndicator: boolean;

  // Mouse tracking
  lastMouseMoveTime: number;
  currentWorldPosition: Vec2;
}

/**
 * Cached coordinate conversion data
 */
interface CoordinateCache {
  canvasRect: DOMRect | null;
  worldOffset: { offsetX: number; offsetY: number; scaleX: number; scaleY: number } | null;
  lastUpdateTime: number;
  cacheValidDuration: number; // Cache valid for 100ms
}

/**
 * MouseHandler - Handles mouse-to-world coordinate conversion
 * Provides on-demand conversion when mouse is inside the canvas
 */
export class MouseHandler {
  private pixiApp: PIXI.Application;
  private canvasElement: HTMLCanvasElement;
  private state: MouseHandlerState;

  // Visual indicator properties
  private mouseIndicator: PIXI.Graphics | null = null;
  private worldContainer: PIXI.Container | null = null;

  // Render sprite reference for accurate world offset calculation
  private renderSprite: PIXI.Sprite | null = null;

  // Mouse inactivity tracking
  private mouseInactivityTimer: NodeJS.Timeout | null = null;
  private mouseInactivityThreshold: number = 1000; // 1 second in milliseconds

  // Scaling information for proper coordinate conversion
  private designWidth: number = 1080;
  private designHeight: number = 1080;

  // Coordinate conversion cache for performance optimization
  private coordinateCache: CoordinateCache;

  constructor(
    pixiApp: PIXI.Application,
    worldContainer?: PIXI.Container,
    renderSprite?: PIXI.Sprite
  ) {
    this.pixiApp = pixiApp;
    this.worldContainer = worldContainer || null;
    this.renderSprite = renderSprite || null;
    this.canvasElement = this.pixiApp.canvas as HTMLCanvasElement;

    // Initialize state
    this.state = {
      isActive: false,
      isMouseInsideCanvas: false,
      isWindowFocused: true,
      isDocumentVisible: true,
      isMouseIdle: false,
      showVisualIndicator: false,
      lastMouseMoveTime: Date.now(),
      currentWorldPosition: new Vec2(),
    };

    // Initialize coordinate cache
    this.coordinateCache = {
      canvasRect: null,
      worldOffset: null,
      lastUpdateTime: 0,
      cacheValidDuration: 100, // 100ms cache validity
    };

    this.setupEventListeners();
    this.createMouseIndicator();
  }

  /**
   * Set up mouse event listeners for the canvas
   */
  private setupEventListeners(): void {
    this.setupMouseEvents();
    this.setupWindowFocusEvents();
    this.setupDocumentVisibilityEvents();
  }

  /**
   * Set up mouse-specific event listeners
   */
  private setupMouseEvents(): void {
    try {
      if (!this.canvasElement) {
        throw new Error("Canvas element not available for event setup");
      }

      // Track mouse enter/leave events to know when mouse is inside canvas
      this.canvasElement.addEventListener("mouseenter", this.handleMouseEnter.bind(this));
      this.canvasElement.addEventListener("mouseleave", this.handleMouseLeave.bind(this));
      this.canvasElement.addEventListener("mousemove", this.handleMouseMove.bind(this));
    } catch (error) {
      console.error("Error setting up mouse events:", error);
    }
  }

  /**
   * Set up window focus event listeners
   */
  private setupWindowFocusEvents(): void {
    try {
      // Window focus/blur events
      window.addEventListener("focus", this.handleWindowFocus.bind(this));
      window.addEventListener("blur", this.handleWindowBlur.bind(this));
    } catch (error) {
      console.error("Error setting up window focus events:", error);
    }
  }

  /**
   * Set up document visibility and mouse leave event listeners
   */
  private setupDocumentVisibilityEvents(): void {
    try {
      // Page visibility API for tab switching
      document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this));

      // Additional mouse leave detection for when mouse leaves the entire window
      document.addEventListener("mouseleave", this.handleDocumentMouseLeave.bind(this));
    } catch (error) {
      console.error("Error setting up document visibility events:", error);
    }
  }

  /**
   * Update FPS based on current state (consolidated logic)
   * Determines whether to use active or idle FPS based on all state conditions
   */
  private updateFPSBasedOnState(): void {
    try {
      if (!fpsManager) {
        console.warn("FPS manager not available - skipping FPS update");
        return;
      }

      // Use active FPS only if ALL conditions are met:
      // - Window is focused AND tab is visible AND mouse is in canvas AND handler is active AND mouse is not idle
      const shouldUseActiveFPS =
        this.state.isWindowFocused &&
        this.state.isDocumentVisible &&
        this.state.isMouseInsideCanvas;

      const targetPreset = shouldUseActiveFPS ? "active" : "idle";
      fpsManager.switchToPreset(targetPreset);
    } catch (error) {
      console.error("Error updating FPS based on state:", error);
    }
  }

  /**
   * Handle window gaining focus
   */
  private handleWindowFocus(): void {
    this.state.isWindowFocused = true;
    console.log("Window gained focus");
    this.updateFPSBasedOnState();
  }

  /**
   * Handle window losing focus
   */
  private handleWindowBlur(): void {
    this.state.isWindowFocused = false;
    console.log("Window lost focus - switching to idle FPS");
    this.updateFPSBasedOnState();
  }

  /**
   * Handle tab visibility changes
   */
  private handleVisibilityChange(): void {
    this.state.isDocumentVisible = !document.hidden;

    if (document.hidden) {
      console.log("Tab became hidden - switching to idle FPS");
    } else {
      console.log("Tab became visible");
    }
    this.updateFPSBasedOnState();
  }

  /**
   * Handle mouse leaving the entire document/window area
   */
  private handleDocumentMouseLeave(): void {
    console.log("Mouse left window area - switching to idle FPS");
    this.updateFPSBasedOnState();
  }

  /**
   * Start or restart the mouse inactivity timer
   */
  private startMouseInactivityTimer(): void {
    // Clear any existing timer
    this.clearMouseInactivityTimer();

    this.mouseInactivityTimer = setTimeout(() => {
      this.state.isMouseIdle = true;
      console.log("Mouse inactive for 1 second - switching to idle FPS");
      this.updateFPSBasedOnState();
    }, this.mouseInactivityThreshold);
  }

  /**
   * Clear the mouse inactivity timer
   */
  private clearMouseInactivityTimer(): void {
    if (this.mouseInactivityTimer) {
      clearTimeout(this.mouseInactivityTimer);
      this.mouseInactivityTimer = null;
    }
  }

  /**
   * Reset mouse activity state and restart timer
   */
  private resetMouseActivity(): void {
    const wasIdle = this.state.isMouseIdle;
    this.state.isMouseIdle = false;
    this.state.lastMouseMoveTime = Date.now();

    // If mouse was idle and now moving, update FPS
    if (wasIdle) {
      console.log("Mouse activity resumed");
      this.updateFPSBasedOnState();
    }

    // Restart the inactivity timer
    this.startMouseInactivityTimer();
  }

  /**
   * Create the visual mouse indicator (red circle)
   */
  private createMouseIndicator(): void {
    this.mouseIndicator = new PIXI.Graphics();
    this.mouseIndicator.circle(0, 0, 5); // 5px radius circle at origin
    this.mouseIndicator.fill({ color: 0xff0000, alpha: 0.8 }); // Red color with slight transparency
    this.mouseIndicator.visible = false; // Initially hidden
    this.mouseIndicator.zIndex = 10000; // Ensure it's always on top

    // Add to the world container if available, otherwise add to stage
    const container = this.worldContainer || this.pixiApp.stage;
    container.addChild(this.mouseIndicator);
  }

  /**
   * Handle mouse entering the canvas
   */
  private handleMouseEnter(event: MouseEvent): void {
    try {
      this.state.isMouseInsideCanvas = true;

      // Reset mouse activity when entering canvas
      this.resetMouseActivity();

      // Show visual indicator when mouse enters canvas
      if (this.mouseIndicator && this.state.showVisualIndicator) {
        this.mouseIndicator.visible = true;
      }

      if (this.state.isActive) {
        const worldCoords = this.mouseToWorldCoords(event.clientX, event.clientY);
        this.state.currentWorldPosition = worldCoords;
        this.updateMouseIndicatorPosition(worldCoords);

        console.log(
          `Mouse entered canvas - World coordinates: (${worldCoords.x.toFixed(
            2
          )}, ${worldCoords.y.toFixed(2)})`
        );
      }
    } catch (error) {
      console.error("Error handling mouse enter:", error);
    }
  }

  /**
   * Handle mouse leaving the canvas
   */
  private handleMouseLeave(event: MouseEvent): void {
    try {
      this.state.isMouseInsideCanvas = false;

      // Clear mouse inactivity timer when leaving canvas
      this.clearMouseInactivityTimer();

      // Update FPS based on current state (mouse no longer in canvas)
      this.updateFPSBasedOnState();

      // Hide visual indicator when mouse leaves canvas
      if (this.mouseIndicator) {
        this.mouseIndicator.visible = false;
      }

      if (this.state.isActive) {
        console.log("Mouse left canvas");
      }
    } catch (error) {
      console.error("Error handling mouse leave:", error);
    }
  }

  /**
   * Handle mouse movement within the canvas
   */
  private handleMouseMove(event: MouseEvent): void {
    try {
      if (this.state.isMouseInsideCanvas && this.state.isActive) {
        // Reset mouse activity on any movement
        this.resetMouseActivity();

        const worldCoords = this.mouseToWorldCoords(event.clientX, event.clientY);
        this.state.currentWorldPosition = worldCoords;
        this.updateMouseIndicatorPosition(worldCoords);
      }
    } catch (error) {
      console.error("Error handling mouse move:", error);
    }
  }

  /**
   * Update the position of the mouse indicator
   */
  private updateMouseIndicatorPosition(worldCoords: Vec2): void {
    if (this.mouseIndicator && this.state.showVisualIndicator) {
      this.mouseIndicator.position.set(worldCoords.x, worldCoords.y);
    }
  }

  /**
   * Update the coordinate conversion cache if needed
   */
  private updateCoordinateCache(): void {
    const now = Date.now();
    const cacheAge = now - this.coordinateCache.lastUpdateTime;

    // Update cache if it's expired or doesn't exist
    if (cacheAge > this.coordinateCache.cacheValidDuration || !this.coordinateCache.canvasRect) {
      this.coordinateCache.canvasRect = this.canvasElement.getBoundingClientRect();
      this.coordinateCache.worldOffset = this.getWorldOffsetInternal();
      this.coordinateCache.lastUpdateTime = now;
    }
  }

  /**
   * Internal method to get world offset without caching
   */
  private getWorldOffsetInternal(): {
    offsetX: number;
    offsetY: number;
    scaleX: number;
    scaleY: number;
  } | null {
    if (!this.renderSprite) {
      return null;
    }

    return {
      offsetX: this.renderSprite.position.x,
      offsetY: this.renderSprite.position.y,
      scaleX: this.renderSprite.scale.x,
      scaleY: this.renderSprite.scale.y,
    };
  }

  /**
   * Convert mouse screen coordinates to world coordinates (optimized with caching)
   * @param mouseX - Mouse X position in screen coordinates
   * @param mouseY - Mouse Y position in screen coordinates
   * @returns Vec2 containing world coordinates
   */
  public mouseToWorldCoords(mouseX: number, mouseY: number): Vec2 {
    // Update cache if needed
    this.updateCoordinateCache();

    const { canvasRect, worldOffset } = this.coordinateCache;

    if (!canvasRect) {
      console.warn("Canvas rect not available for coordinate conversion");
      return new Vec2(0, 0);
    }

    // Step 1: Convert global mouse position to canvas-relative position
    const canvasX = mouseX - canvasRect.left;
    const canvasY = mouseY - canvasRect.top;

    // Step 2: Use cached world offset for precise coordinate calculation
    if (worldOffset) {
      // Use render sprite offset and scale for precise world coordinate calculation
      const adjustedX = (canvasX - worldOffset.offsetX) / worldOffset.scaleX;
      const adjustedY = (canvasY - worldOffset.offsetY) / worldOffset.scaleY;

      return new Vec2(adjustedX, adjustedY);
    } else {
      // Fallback to simple scaling method
      const worldX = (canvasX / canvasRect.width) * this.designWidth;
      const worldY = (canvasY / canvasRect.height) * this.designHeight;

      return new Vec2(worldX, worldY);
    }
  }

  /**
   * Activate the mouse handler (enables console logging and visual indicator)
   */
  public activate(): void {
    this.state.isActive = true;
    this.state.showVisualIndicator = true;

    // Show indicator if mouse is already inside canvas
    if (this.mouseIndicator && this.state.isMouseInsideCanvas) {
      this.mouseIndicator.visible = true;
    }

    // Start mouse inactivity tracking if mouse is inside canvas
    if (this.state.isMouseInsideCanvas) {
      this.resetMouseActivity();
    }

    // Update FPS based on current state when activating
    this.updateFPSBasedOnState();

    console.log("MouseHandler activated - mouse coordinates will be logged when inside canvas");
  }

  /**
   * Deactivate the mouse handler (disables console logging and visual indicator)
   */
  public deactivate(): void {
    this.state.isActive = false;
    this.state.showVisualIndicator = false;

    // Clear mouse inactivity timer when deactivating
    this.clearMouseInactivityTimer();

    // Hide the visual indicator
    if (this.mouseIndicator) {
      this.mouseIndicator.visible = false;
    }

    // Set to idle FPS when deactivating
    this.updateFPSBasedOnState();

    console.log("MouseHandler deactivated");
  }

  /**
   * Enable only the visual indicator (without console logging)
   */
  public enableVisualIndicator(): void {
    this.state.showVisualIndicator = true;
    if (this.mouseIndicator && this.state.isMouseInsideCanvas) {
      this.mouseIndicator.visible = true;
    }
  }

  /**
   * Disable the visual indicator
   */
  public disableVisualIndicator(): void {
    this.state.showVisualIndicator = false;
    if (this.mouseIndicator) {
      this.mouseIndicator.visible = false;
    }
  }

  /**
   * Check if mouse is currently inside the canvas
   */
  public isMouseInside(): boolean {
    return this.state.isMouseInsideCanvas;
  }

  /**
   * Check if the handler is currently active
   */
  public isHandlerActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get the current world position of the mouse
   */
  public getCurrentWorldPosition(): Vec2 {
    return new Vec2(this.state.currentWorldPosition.x, this.state.currentWorldPosition.y);
  }

  /**
   * Check if the visual indicator is currently enabled
   */
  public isVisualIndicatorEnabled(): boolean {
    return this.state.showVisualIndicator;
  }

  /**
   * Get the current world offset from the render sprite (with caching)
   * This represents how much the world has been translated and scaled on the canvas
   * @returns Object containing offset and scale information, or null if render sprite not available
   */
  public getWorldOffset(): {
    offsetX: number;
    offsetY: number;
    scaleX: number;
    scaleY: number;
  } | null {
    if (!this.renderSprite) {
      console.warn("Render sprite not available for world offset calculation");
      return null;
    }

    // Update cache if needed and return cached value
    this.updateCoordinateCache();
    return this.coordinateCache.worldOffset;
  }

  /**
   * Invalidate the coordinate conversion cache
   * Call this when render sprite properties change or canvas is resized
   */
  public invalidateCoordinateCache(): void {
    this.coordinateCache.lastUpdateTime = 0;
    this.coordinateCache.canvasRect = null;
    this.coordinateCache.worldOffset = null;
  }

  /**
   * Set the render sprite reference for accurate coordinate calculations
   * @param renderSprite - The PIXI sprite used for rendering the world
   * @param designWidth - The design width of the world (default: 1920)
   * @param designHeight - The design height of the world (default: 1080)
   */
  public setRenderSprite(
    renderSprite: PIXI.Sprite,
    designWidth: number = 1920,
    designHeight: number = 1080
  ): void {
    this.renderSprite = renderSprite;
    this.designWidth = designWidth;
    this.designHeight = designHeight;

    // Invalidate cache when render sprite changes
    this.invalidateCoordinateCache();

    console.log(
      `MouseHandler render sprite set with design dimensions: ${designWidth}x${designHeight}`
    );
  }

  /**
   * Get the current design dimensions
   */
  public getDesignDimensions(): { width: number; height: number } {
    return { width: this.designWidth, height: this.designHeight };
  }

  /**
   * Set the mouse inactivity threshold
   * @param milliseconds - Time in milliseconds before mouse is considered idle
   */
  public setMouseInactivityThreshold(milliseconds: number): void {
    if (milliseconds < 100) {
      console.warn("Mouse inactivity threshold too low. Minimum is 100ms.");
      return;
    }

    this.mouseInactivityThreshold = milliseconds;
    console.log(`Mouse inactivity threshold set to ${milliseconds}ms`);

    // Restart timer with new threshold if currently active
    if (this.state.isMouseInsideCanvas && this.state.isActive && !this.state.isMouseIdle) {
      this.startMouseInactivityTimer();
    }
  }

  /**
   * Get the current mouse inactivity threshold
   */
  public getMouseInactivityThreshold(): number {
    return this.mouseInactivityThreshold;
  }

  /**
   * Get current state information for debugging
   */
  public getState(): {
    isActive: boolean;
    isMouseInsideCanvas: boolean;
    isWindowFocused: boolean;
    isDocumentVisible: boolean;
    showVisualIndicator: boolean;
    isMouseIdle: boolean;
    lastMouseMoveTime: number;
    hasRenderSprite: boolean;
    worldOffset: { offsetX: number; offsetY: number; scaleX: number; scaleY: number } | null;
  } {
    return {
      isActive: this.state.isActive,
      isMouseInsideCanvas: this.state.isMouseInsideCanvas,
      isWindowFocused: this.state.isWindowFocused,
      isDocumentVisible: this.state.isDocumentVisible,
      showVisualIndicator: this.state.showVisualIndicator,
      isMouseIdle: this.state.isMouseIdle,
      lastMouseMoveTime: this.state.lastMouseMoveTime,
      hasRenderSprite: this.renderSprite !== null,
      worldOffset: this.getWorldOffset(),
    };
  }

  /**
   * Clean up event listeners and visual elements
   */
  public dispose(): void {
    try {
      // Remove canvas event listeners
      if (this.canvasElement) {
        this.canvasElement.removeEventListener("mouseenter", this.handleMouseEnter.bind(this));
        this.canvasElement.removeEventListener("mouseleave", this.handleMouseLeave.bind(this));
        this.canvasElement.removeEventListener("mousemove", this.handleMouseMove.bind(this));
      }

      // Remove window and document event listeners
      window.removeEventListener("focus", this.handleWindowFocus.bind(this));
      window.removeEventListener("blur", this.handleWindowBlur.bind(this));
      document.removeEventListener("visibilitychange", this.handleVisibilityChange.bind(this));
      document.removeEventListener("mouseleave", this.handleDocumentMouseLeave.bind(this));

      // Clear mouse inactivity timer
      this.clearMouseInactivityTimer();

      // Clean up visual indicator
      if (this.mouseIndicator) {
        const container = this.worldContainer || this.pixiApp.stage;
        if (container) {
          container.removeChild(this.mouseIndicator);
        }
        this.mouseIndicator.destroy();
        this.mouseIndicator = null;
      }

      // Reset state
      this.state = {
        isActive: false,
        isMouseInsideCanvas: false,
        isWindowFocused: true,
        isDocumentVisible: true,
        isMouseIdle: false,
        showVisualIndicator: false,
        lastMouseMoveTime: Date.now(),
        currentWorldPosition: new Vec2(),
      };

      this.renderSprite = null;

      // Clear coordinate cache
      this.coordinateCache = {
        canvasRect: null,
        worldOffset: null,
        lastUpdateTime: 0,
        cacheValidDuration: 100,
      };
    } catch (error) {
      console.error("Error during MouseHandler disposal:", error);
    }
  }
}

/**
 * Global mouse handler instance - will be initialized when canvas is created
 */
export let mouseHandler: MouseHandler | null = null;

/**
 * Initialize the global mouse handler instance
 * @param pixiApp - The PIXI application instance
 * @param worldContainer - Optional world container for proper coordinate positioning
 * @param renderSprite - Optional render sprite for accurate world offset calculations
 */
export function initializeMouseHandler(
  pixiApp: PIXI.Application,
  worldContainer?: PIXI.Container,
  renderSprite?: PIXI.Sprite
): void {
  if (mouseHandler) {
    mouseHandler.dispose();
  }
  mouseHandler = new MouseHandler(pixiApp, worldContainer, renderSprite);
  mouseHandler.activate(); // Auto-activate as requested
}

/**
 * Get the current mouse world coordinates (on-demand conversion)
 * @param mouseX - Mouse X position in screen coordinates (optional, uses current if not provided)
 * @param mouseY - Mouse Y position in screen coordinates (optional, uses current if not provided)
 * @returns Vec2 containing world coordinates, or null if handler not initialized
 */
export function mouseToWorldCoords(mouseX?: number, mouseY?: number): Vec2 | null {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return null;
  }

  if (mouseX !== undefined && mouseY !== undefined) {
    return mouseHandler.mouseToWorldCoords(mouseX, mouseY);
  }

  // If no coordinates provided, we can't determine current mouse position
  // This would require tracking the last known mouse position
  console.warn("Mouse coordinates not provided and current position tracking not implemented.");
  return null;
}

/**
 * Get the current state of the mouse handler for debugging
 * @returns Current state object or null if handler not initialized
 */
export function getMouseHandlerState(): any {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return null;
  }
  return mouseHandler.getState();
}

/**
 * Set the mouse inactivity threshold globally
 * @param milliseconds - Time in milliseconds before mouse is considered idle (default: 1000ms)
 */
export function setMouseInactivityThreshold(milliseconds: number): void {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return;
  }
  mouseHandler.setMouseInactivityThreshold(milliseconds);
}

/**
 * Get the current mouse inactivity threshold
 * @returns Current threshold in milliseconds, or null if handler not initialized
 */
export function getMouseInactivityThreshold(): number | null {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return null;
  }
  return mouseHandler.getMouseInactivityThreshold();
}

/**
 * Get the current world offset from the render sprite
 * @returns World offset information or null if handler not initialized or render sprite not available
 */
export function getWorldOffset(): {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
} | null {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return null;
  }
  return mouseHandler.getWorldOffset();
}

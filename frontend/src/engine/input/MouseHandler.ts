import * as PIXI from "pixi.js";
import { Vec2 } from "../physics/Vec2";
import { fpsManager } from "./DynamicFPSManager";

/**
 * MouseHandler state modes
 */
export enum MouseState {
  IDLE = "idle",
  ACTIVE = "active",
}

/**
 * MouseHandler state interface for consolidated state management
 */
interface MouseHandlerState {
  // Current state mode
  currentMode: MouseState;

  // Canvas tracking
  isMouseInsideCanvas: boolean;
  isWindowFocused: boolean;
  isDocumentVisible: boolean;

  // Visual settings
  showVisualIndicator: boolean;

  // Mouse tracking
  lastMouseMoveTime: number;
  currentWorldPosition: Vec2;

  // Mouse button state
  isLeftButtonDown: boolean;
  isRightButtonDown: boolean;
  isLeftButtonClicked: boolean;
  isRightButtonClicked: boolean;
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
 * Global MouseHandler instance
 */
export interface MouseStateDetails {
  currentMode: MouseState;
  isMouseInsideCanvas: boolean;
  isWindowFocused: boolean;
  isDocumentVisible: boolean;
  showVisualIndicator: boolean;
  lastMouseMoveTime: number;
  hasRenderSprite: boolean;
  worldOffset: { offsetX: number; offsetY: number; scaleX: number; scaleY: number } | null;
}

/**
 * MouseHandler - Reactive mouse tracking and coordinate conversion system
 * - Always starts in IDLE mode (low FPS)
 * - Switches to ACTIVE mode only when explicitly called via toggleState()
 * - Auto-returns to IDLE after 1 second unless toggled again
 * - Provides mouse position tracking and visual indicator
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

  // State management timer
  private idleTimer: NodeJS.Timeout | null = null;
  private idleTimeout: number = 1000; // 1 second in milliseconds

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

    // Initialize state - start in IDLE mode by default
    this.state = {
      currentMode: MouseState.IDLE,
      isMouseInsideCanvas: false,
      isWindowFocused: true,
      isDocumentVisible: true,
      showVisualIndicator: false,
      lastMouseMoveTime: Date.now(),
      currentWorldPosition: new Vec2(),
      isLeftButtonDown: false,
      isRightButtonDown: false,
      isLeftButtonClicked: false,
      isRightButtonClicked: false,
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

    // Initialize FPS to idle mode
    this.updateFPSBasedOnState();
  }

  /**
   * Toggle between ACTIVE and IDLE states
   * - Switches to ACTIVE mode and shows visual indicator
   * - Auto-returns to IDLE mode after 1 second unless called again
   * - Resets timer if already in ACTIVE mode
   * @returns The new state after toggling
   */
  public toggleState(): MouseState {
    // Clear existing idle timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    // Set to active mode
    this.state.currentMode = MouseState.ACTIVE;
    this.state.showVisualIndicator = true;

    // Show indicator if mouse is inside canvas
    if (this.mouseIndicator && this.state.isMouseInsideCanvas) {
      this.mouseIndicator.visible = true;
    }

    // Update FPS to active mode
    this.updateFPSBasedOnState();

    // Set timer to return to idle mode
    this.idleTimer = setTimeout(() => {
      this.returnToIdle();
    }, this.idleTimeout);

    return this.state.currentMode;
  }

  /**
   * Return to IDLE state
   * - Sets mode to IDLE and hides visual indicator
   * - Updates FPS to idle mode
   */
  private returnToIdle(): void {
    this.state.currentMode = MouseState.IDLE;
    this.state.showVisualIndicator = false;

    // Hide indicator
    if (this.mouseIndicator) {
      this.mouseIndicator.visible = false;
    }

    // Update FPS to idle mode
    this.updateFPSBasedOnState();

    // Clear timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Get current state mode
   */
  public getCurrentMode(): MouseState {
    return this.state.currentMode;
  }

  /**
   * Check if currently in active mode
   */
  public isActive(): boolean {
    return this.state.currentMode === MouseState.ACTIVE;
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
      this.canvasElement.addEventListener("mousedown", this.handleMouseDown.bind(this));
      this.canvasElement.addEventListener("mouseup", this.handleMouseUp.bind(this));
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
    this.updateFPSBasedOnState();
  }

  /**
   * Handle window losing focus
   */
  private handleWindowBlur(): void {
    this.state.isWindowFocused = false;
    this.updateFPSBasedOnState();
  }

  /**
   * Handle tab visibility changes
   */
  private handleVisibilityChange(): void {
    this.state.isDocumentVisible = !document.hidden;
    this.updateFPSBasedOnState();
  }

  /**
   * Handle mouse leaving the entire document/window area
   */
  private handleDocumentMouseLeave(): void {
    this.updateFPSBasedOnState();
  }

  /**
   * Create the visual mouse indicator (red circle)
   */
  private createMouseIndicator(): void {
    this.mouseIndicator = new PIXI.Graphics();

    // PIXI v8 syntax for drawing a circle
    this.mouseIndicator
      .circle(0, 0, 5) // 5px radius circle at origin
      .fill({ color: 0xff0000, alpha: 0.8 }); // Red color with slight transparency

    this.mouseIndicator.visible = false; // Initially hidden
    this.mouseIndicator.zIndex = 10000; // Ensure it's always on top

    // Add to the world container if available, otherwise add to stage
    const container = this.worldContainer || this.pixiApp.stage;
    container.addChild(this.mouseIndicator);

    // Force render after adding
    this.pixiApp.renderer.render(container);
  }

  /**
   * Handle mouse entering the canvas
   */
  private handleMouseEnter(event: MouseEvent): void {
    try {
      this.state.isMouseInsideCanvas = true;

      // Calculate world coordinates
      const worldCoords = this.mouseToWorldCoords(event.clientX, event.clientY);
      this.state.currentWorldPosition = worldCoords;

      // Show and position visual indicator if enabled
      if (this.mouseIndicator && this.state.showVisualIndicator) {
        this.mouseIndicator.visible = true;
        this.updateMouseIndicatorPosition(worldCoords);
      }

      // Update FPS based on new state
      this.updateFPSBasedOnState();
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

      // Update FPS based on current state (mouse no longer in canvas)
      this.updateFPSBasedOnState();

      // Hide visual indicator when mouse leaves canvas
      if (this.mouseIndicator) {
        this.mouseIndicator.visible = false;
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
      if (this.state.isMouseInsideCanvas) {
        const worldCoords = this.mouseToWorldCoords(event.clientX, event.clientY);
        this.state.currentWorldPosition = worldCoords;
        this.state.lastMouseMoveTime = Date.now();

        // Always update visual indicator if it's enabled
        if (this.state.showVisualIndicator) {
          this.updateMouseIndicatorPosition(worldCoords);
        }
      }
    } catch (error) {
      console.error("Error handling mouse move:", error);
    }
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.state.isLeftButtonDown = true;
      this.state.isLeftButtonClicked = false;
    } else if (event.button === 2) {
      this.state.isRightButtonDown = true;
      this.state.isRightButtonClicked = false;
    }
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      if (this.state.isLeftButtonDown) {
        this.state.isLeftButtonClicked = true;
      }
      this.state.isLeftButtonDown = false;
    } else if (event.button === 2) {
      if (this.state.isRightButtonDown) {
        this.state.isRightButtonClicked = true;
      }
      this.state.isRightButtonDown = false;
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

      const result = new Vec2(adjustedX, adjustedY);
      return result;
    } else {
      // Fallback to simple scaling method
      const worldX = (canvasX / canvasRect.width) * this.designWidth;
      const worldY = (canvasY / canvasRect.height) * this.designHeight;

      const result = new Vec2(worldX, worldY);
      return result;
    }
  }

  /**
   * Enable the visual indicator
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
   * Check if the left mouse button is currently pressed down.
   * @returns True if the left button is down, false otherwise.
   */
  public isLeftButtonDown(): boolean {
    return this.state.isLeftButtonDown;
  }

  /**
   * Check if the right mouse button is currently pressed down.
   * @returns True if the right button is down, false otherwise.
   */
  public isRightButtonDown(): boolean {
    return this.state.isRightButtonDown;
  }

  /**
   * Check if the left mouse button was clicked in the current frame.
   * @returns True if a click occurred, false otherwise.
   */
  public wasLeftButtonClicked(): boolean {
    return this.state.isLeftButtonClicked;
  }

  /**
   * Check if the right mouse button was clicked in the current frame.
   * @returns True if a click occurred, false otherwise.
   */
  public wasRightButtonClicked(): boolean {
    return this.state.isRightButtonClicked;
  }

  /**
   * Resets the click state for both buttons.
   * Should be called at the end of each frame/update loop.
   */
  public resetClickState(): void {
    this.state.isLeftButtonClicked = false;
    this.state.isRightButtonClicked = false;
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
  /**
   * Get current state information for debugging
   */
  public getState(): MouseStateDetails {
    return {
      currentMode: this.state.currentMode,
      isMouseInsideCanvas: this.state.isMouseInsideCanvas,
      isWindowFocused: this.state.isWindowFocused,
      isDocumentVisible: this.state.isDocumentVisible,
      showVisualIndicator: this.state.showVisualIndicator,
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

      // Clear idle timer
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }

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
        currentMode: MouseState.IDLE,
        isMouseInsideCanvas: false,
        isWindowFocused: true,
        isDocumentVisible: true,
        showVisualIndicator: false,
        lastMouseMoveTime: Date.now(),
        currentWorldPosition: new Vec2(),
        isLeftButtonDown: false,
        isRightButtonDown: false,
        isLeftButtonClicked: false,
        isRightButtonClicked: false,
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
  // Note: MouseHandler now starts in IDLE mode by default
  // Use toggleState() to activate when needed
}

/**
 * Toggle the mouse handler state between IDLE and ACTIVE
 * @returns The new state after toggling
 */
export function toggleMouseHandlerState(): MouseState | null {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return null;
  }
  return mouseHandler.toggleState();
}

/**
 * Get the current mode of the mouse handler
 * @returns Current mode (IDLE or ACTIVE) or null if handler not initialized
 */
export function getMouseHandlerMode(): MouseState | null {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return null;
  }
  return mouseHandler.getCurrentMode();
}

/**
 * Check if the mouse handler is currently active
 * @returns True if active, false if idle, null if handler not initialized
 */
export function isMouseHandlerActive(): boolean | null {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return null;
  }
  return mouseHandler.isActive();
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
export function getMouseHandlerState(): MouseStateDetails | null {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return null;
  }
  return mouseHandler.getState();
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

/**
 * Check if the left mouse button was clicked in the current frame.
 * @returns True if a click occurred, false otherwise, or null if handler not initialized.
 */
export function wasLeftButtonClicked(): boolean | null {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return null;
  }
  return mouseHandler.wasLeftButtonClicked();
}

/**
 * Check if the right mouse button was clicked in the current frame.
 * @returns True if a click occurred, false otherwise, or null if handler not initialized.
 */
export function wasRightButtonClicked(): boolean | null {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return null;
  }
  return mouseHandler.wasRightButtonClicked();
}

/**
 * Resets the click state for both buttons.
 * Should be called at the end of each frame/update loop.
 */
export function resetClickState(): void {
  if (!mouseHandler) {
    console.warn("MouseHandler not initialized. Call initializeMouseHandler first.");
    return;
  }
  mouseHandler.resetClickState();
}

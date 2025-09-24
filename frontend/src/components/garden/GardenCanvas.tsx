"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { WorldPhysicsHandler } from "@/engine/WorldPhysicsHandler";
import { constructDefaultWorld, createDefaultWorldConfig } from "@/engine/DefaultWorld";
import {
  initializeMouseHandler,
  mouseHandler,
  toggleMouseHandlerState,
  getMouseHandlerMode,
  resetClickState,
} from "@/engine/input/MouseHandler";
import { initializeFPSManager } from "@/engine/input/DynamicFPSManager";
import { createMouseCursor } from "@/debug/MouseCursor";
import { RendererHandler } from "@/engine/rendering/RendererHandler";
import { SpriteRenderer } from "@/engine/rendering/SpriteRenderer";
import { refreshWorldStructures } from "@/engine/DefaultWorld";
import { 
  setGlobalWorldRefreshHandler,
  clearGlobalWorldRefreshHandler
} from "@/utils/globalWorldRefreshHandler";

export const FRAMERATE = 6;
export const DAYLIGHT_FRAMERATE = 0.1;
export const DAY_CYCLE_TIME = 180;

// Ensure we're in browser environment before using ResizeObserver
const isClient = typeof window !== "undefined";
const hasResizeObserver = isClient && typeof ResizeObserver !== "undefined";

// Design constants for consistent scaling
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

export default function GardenCanvas({
  onAppCreated,
  userId,
}: {
  onAppCreated: (app: PIXI.Application) => void;
  userId?: string;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldContainerRef = useRef<PIXI.Container | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const worldHandlerRef = useRef<any>(null);
  const rendererHandlerRef = useRef<RendererHandler | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted and stable before initializing PIXI
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const el = parentRef.current;
    if (!el || appRef.current) return;

    let disposed = false;
    let initializationInProgress = false;

    async function init() {
      // Ensure we're in client environment before initializing PIXI
      if (!isClient) {
        console.log("[GardenCanvas] Not in client environment, skipping initialization...");
        return;
      }

      // Prevent multiple initializations from running simultaneously
      if (initializationInProgress) {
        console.log("[GardenCanvas] Initialization already in progress, skipping...");
        return;
      }

      initializationInProgress = true;

      try {
        console.log("[GardenCanvas] Starting PIXI app initialization...");

        // Check if component was disposed before we even start
        if (disposed) {
          console.log("[GardenCanvas] Component disposed before initialization, aborting...");
          return;
        }

        // Re-check element validity (React might have unmounted)
        const currentEl = parentRef.current;
        if (!currentEl) {
          console.log(
            "[GardenCanvas] Parent element no longer available, aborting initialization..."
          );
          return;
        }

        // ------------------------------------------------------------------------------ //
        const app = new PIXI.Application();
        app.stage.interactive = true; // Enable interactivity on the stage
        console.log("[GardenCanvas] PIXI Application created:", app);

        if (!app) {
          throw new Error("Failed to create PIXI Application - app is null/undefined");
        }

        // Store app reference immediately to prevent race conditions
        appRef.current = app;
        console.log("[GardenCanvas] App stored in ref:", appRef.current);

        // Double-check element is still valid before initializing
        const elementCheck = parentRef.current;
        if (!elementCheck || disposed) {
          console.log("[GardenCanvas] Element became invalid during setup, cleaning up...");
          app.destroy(true);
          appRef.current = null;
          return;
        }

        await app.init({
          // backgroundAlpha: 0,
          backgroundColor: 0x1099bb,
          antialias: false, // Disable for pixel-perfect scaling
          preference: "webgl",
          width: elementCheck.clientWidth,
          height: elementCheck.clientHeight,
        });
        // Don't stop the ticker - we want it running for FPS management

        console.log("[GardenCanvas] PIXI app initialized successfully");
        console.log("[GardenCanvas] Canvas element:", app.canvas);

        if (disposed) {
          console.log("[GardenCanvas] Component was disposed during init, cleaning up...");
          if (app && typeof app.destroy === "function") {
            app.destroy(true);
          }
          return;
        }

        console.log("[GardenCanvas] Calling onAppCreated callback...");
        onAppCreated(app);

        // Final check before DOM manipulation
        const finalElementCheck = parentRef.current;
        if (!finalElementCheck || disposed) {
          console.log("[GardenCanvas] Element no longer valid for DOM append, cleaning up...");
          app.destroy(true);
          appRef.current = null;
          return;
        }

        console.log("[GardenCanvas] Appending canvas to DOM...");

        // Apply CSS styles to make canvas fill parent completely
        app.canvas.style.width = "100%";
        app.canvas.style.height = "100%";
        app.canvas.style.display = "block";
        app.canvas.style.position = "absolute";
        app.canvas.style.top = "0";
        app.canvas.style.left = "0";

        // Declare onResize function reference
        // eslint-disable-next-line prefer-const
        let onResizeFunction: (() => void) | undefined;

        // Manual resize handler to ensure canvas matches parent
        const handleResize = () => {
          if (disposed || !parentRef.current) return;
          const parent = parentRef.current;
          app.renderer.resize(parent.clientWidth, parent.clientHeight);

          // Trigger the onResize to update renderSprite scaling (only if defined)
          if (onResizeFunction) {
            onResizeFunction();
          }
        };

        // Set up resize observer for responsive behavior - use a defensive approach
        let resizeObserver: ResizeObserver | null = null;
        try {
          if (hasResizeObserver) {
            resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(elementCheck);
            resizeObserverRef.current = resizeObserver;
          }
        } catch (error) {
          console.warn("ResizeObserver initialization failed:", error);
          // Fallback to window resize listener if ResizeObserver fails
          const fallbackResize = () => handleResize();
          window.addEventListener("resize", fallbackResize);
          // Store cleanup function
          resizeObserverRef.current = {
            disconnect: () => window.removeEventListener("resize", fallbackResize),
          } as ResizeObserver;
        }

        finalElementCheck.appendChild(app.canvas);

        // ------------------------------------------------------------------------------ //
        // Create render sprite as framebuffer with fixed design resolution
        const renderTexture = PIXI.RenderTexture.create({
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
        });
        const renderSprite = new PIXI.Sprite(renderTexture);
        renderSprite.position.set(0, 0);
        app.stage.addChild(renderSprite);

        // Create world container for scene objects
        const worldContainer = new PIXI.Container();
        worldContainerRef.current = worldContainer;

        // Initialize Dynamic FPS Manager for performance optimization
        console.log("[GardenCanvas] Initializing Dynamic FPS Manager...");
        initializeFPSManager(app);

        // Initialize MouseHandler for mouse-to-world coordinate conversion with visual indicator
        console.log(
          "[GardenCanvas] Initializing MouseHandler with world container and render sprite..."
        );
        initializeMouseHandler(app, worldContainer, renderSprite);

        // Test the new reactive MouseHandler system
        console.log("[GardenCanvas] MouseHandler initialized in IDLE mode by default");
        if (mouseHandler) {
          // Test toggling to ACTIVE mode
          setTimeout(() => {
            console.log("[GardenCanvas] Testing reactive MouseHandler system:");
            console.log("Current mode:", getMouseHandlerMode());

            console.log("Toggling to ACTIVE state...");
            const newState = toggleMouseHandlerState();
            console.log("New state after toggle:", newState);
          }, 1000);

          // Test auto-return to IDLE mode
          setTimeout(() => {
            console.log("[GardenCanvas] Checking auto-return to IDLE mode after 2 seconds...");
            console.log("Current mode should be IDLE:", getMouseHandlerMode());
          }, 3000);
        }

        // Create mouse cursor for basic testing
        console.log("[GardenCanvas] Creating mouse cursor for basic testing...");
        createMouseCursor(app);

        console.log("[GardenCanvas] Initializing WorldPhysicsHandler for entity management...");
        // Use real user ID from props, fallback to demo user
        const worldUserId = userId || "demo_user_123";
        const worldHandler = await constructDefaultWorld(app, worldContainer, worldUserId);
        worldHandlerRef.current = worldHandler;

        // Set up global world refresh handler
        const refreshHandler = async () => {
          if (worldHandlerRef.current && worldUserId) {
            await refreshWorldStructures(worldHandlerRef.current, worldUserId);
          }
        };
        setGlobalWorldRefreshHandler(refreshHandler);

        console.log("[GardenCanvas] Default world constructed with entities:", {
          entityCount: worldHandler.getEntityCount(),
          userId: worldUserId,
          entities: worldHandler
            .getAllEntities()
            .map((e) => ({ id: e.id, tags: e.tags, position: e.position })),
        });

        // Create visual content for the world container (tilemap, sprites, etc.)
        console.log("[GardenCanvas] Setting up visual world content...");

        // Add tilemap as background
        const tilemapTexture = await PIXI.Assets.load("/level/map.png");
        const tilemapSprite = new PIXI.Sprite(tilemapTexture);
        const initialScale = (DESIGN_WIDTH / tilemapTexture.width) * 0.9;
        tilemapSprite.anchor.set(0.5);
        tilemapSprite.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
        tilemapSprite.scale.set(initialScale);
        tilemapSprite.zIndex = -999999999; // Set background to lowest z-index as requested
        tilemapTexture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
        worldContainer.addChild(tilemapSprite);

        console.log("[GardenCanvas] Tilemap added to world container:", {
          texture: tilemapTexture,
          scale: initialScale,
          position: { x: DESIGN_WIDTH / 2, y: DESIGN_HEIGHT / 2 },
          containerChildren: worldContainer.children.length,
        });

        // Initialize the rendering system
        console.log("[GardenCanvas] Initializing rendering system...");
        const rendererHandler = new RendererHandler(app, worldContainer);
        rendererHandlerRef.current = rendererHandler;

        // Create visual representations for all physics entities using the rendering system
        console.log("[GardenCanvas] Setting up entity renderers...");
        const entities = worldHandler.getAllEntities();
        let renderersCreated = 0;

        for (const entity of entities) {
          // Create a SpriteRenderer for each entity
          const spriteRenderer = new SpriteRenderer();

          // Enable debug mode to show red rectangles for entities without custom sprites
          spriteRenderer.setDebugMode(true);

          // Register the renderer with the handler
          rendererHandler.registerRenderer(entity.id, spriteRenderer);
          renderersCreated++;
        }

        console.log("[GardenCanvas] Entity renderers created:", {
          entitiesCount: entities.length,
          renderersCreated,
          totalWorldContainerChildren: worldContainer.children.length,
        });

        // Sort children by zIndex for proper layering
        worldContainer.sortChildren();

        // Use the app's built-in ticker for FPS management integration
        const ticker = app.ticker;
        ticker.minFPS = 3;
        ticker.maxFPS = 60;

        let isActiveTab = true;
        let needsInitialRender = true;

        // Game render loop using the new rendering system
        ticker.add(() => {
          if (disposed) return;
          if (!isActiveTab) return;

          // Check if we need to render
          const hasEntityChanges = worldHandler.hasChanges();
          const shouldRender = needsInitialRender || hasEntityChanges;

          if (!shouldRender) return;

          // Render all entities using the rendering system
          const currentEntities = worldHandler.getAllEntities();
          for (const entity of currentEntities) {
            rendererHandler.renderEntity(entity);
          }

          // Render world container to the render texture (framebuffer)
          app.renderer.render(worldContainer, { renderTexture });

          // Render the final result to screen
          app.renderer.render(app.stage);

          // Reset flags after rendering
          if (hasEntityChanges) {
            worldHandler.resetAllChanges();
          }
          needsInitialRender = false;
        });

        // Start the ticker
        ticker.start();

        // Update resize handler to scale the framebuffer display, not individual objects
        const onResize = () => {
          // Update hit area
          app.stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);

          // Calculate scale to maintain aspect ratio based on width
          const scaleX = app.screen.width / renderTexture.width;
          const scaleY = app.screen.height / renderTexture.height;

          // Use the bigger scale to maintain aspect ratio without stretching
          const uniformScale = Math.max(scaleX, scaleY);

          renderSprite.scale.set(uniformScale);

          // Center the render sprite
          renderSprite.position.set(
            (app.screen.width - renderTexture.width * uniformScale) / 2,
            (app.screen.height - renderTexture.height * uniformScale) / 2
          );

          // Force a re-render after resize
          needsInitialRender = true;
        };

        // Assign the onResize function to the reference so handleResize can call it
        onResizeFunction = onResize;

        app.renderer.on("resize", onResize);
        onResize();

        // Handle tab visibility changes
        window.addEventListener("visibilitychange", () => {
          isActiveTab = document.visibilityState === "visible";
          if (!isActiveTab) {
            ticker.stop(); // Pause the ticker when the tab is inactive
          } else {
            ticker.start(); // Resume the ticker when the tab becomes active
          }
        });

        console.log("[GardenCanvas] Initialization completed successfully!");
      } catch (error) {
        console.error("[GardenCanvas] Error during initialization:", error);

        // Clean up if there was an error
        if (appRef.current) {
          try {
            if (typeof appRef.current.destroy === "function") {
              appRef.current.destroy(true);
            }
          } catch (destroyError) {
            console.error("[GardenCanvas] Error destroying app during cleanup:", destroyError);
          }
          appRef.current = null;
        }

        // Reset all refs
        worldContainerRef.current = null;

        // Don't re-throw to prevent cascading errors
        console.log("[GardenCanvas] Initialization failed, but cleanup completed");
      } finally {
        initializationInProgress = false;
      }
    }

    init().catch((error) => {
      console.error("[GardenCanvas] Failed to initialize canvas:", error);
    });

    return () => {
      console.log("[GardenCanvas] Cleanup function called");
      disposed = true;
      const app = appRef.current;

      // Clean up renderer handler
      if (rendererHandlerRef.current) {
        console.log("[GardenCanvas] Cleaning up renderer handler...");
        const entities = worldHandlerRef.current?.getAllEntities() || [];
        for (const entity of entities) {
          rendererHandlerRef.current.removeRenderer(entity.id);
        }
        rendererHandlerRef.current = null;
      }

      // Clear world handler ref
      if (worldHandlerRef.current) {
        worldHandlerRef.current = null;
      }

      // Clean up resize observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      // Remove canvas from DOM first (optional, but safe)
      const elNow = parentRef.current;
      if (elNow?.firstChild) {
        try {
          elNow.removeChild(elNow.firstChild);
        } catch (error) {
          console.warn("[GardenCanvas] Error removing canvas from DOM:", error);
        }
      }

      // Safely destroy app (destroys stage, children, and textures)
      if (app && typeof app.destroy === "function") {
        try {
          console.log("[GardenCanvas] Destroying PIXI app...");
          app.destroy(true);
        } catch (error) {
          console.error("[GardenCanvas] Error destroying PIXI app:", error);
        }
        appRef.current = null;
      }

      // Set refs to null
      worldContainerRef.current = null;

      // Clear global world refresh handler
      clearGlobalWorldRefreshHandler();

      console.log("[GardenCanvas] Cleanup completed");
    };
  }, [isMounted]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={parentRef} className="w-full h-full overflow-hidden" />
    </div>
  );
}

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
import { RendererHandler } from "@/engine/rendering/RendererHandler";
import { SpriteRenderer } from "@/engine/rendering/SpriteRenderer";
import { refreshWorldStructures } from "@/engine/DefaultWorld";
import {
  setGlobalWorldRefreshHandler,
  clearGlobalWorldRefreshHandler,
} from "@/utils/globalWorldRefreshHandler";
import { visualWorldUpdateService } from "@/utils/visualWorldUpdateService";

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
        return;
      }

      // Prevent multiple initializations from running simultaneously
      if (initializationInProgress) {
        return;
      }

      initializationInProgress = true;

      try {
        // Check if component was disposed before we even start
        if (disposed) {
          return;
        }

        // Re-check element validity (React might have unmounted)
        const currentEl = parentRef.current;
        if (!currentEl) {
          return;
        }

        // ------------------------------------------------------------------------------ //
        const app = new PIXI.Application();
        app.stage.interactive = true; // Enable interactivity on the stage

        if (!app) {
          throw new Error("Failed to create PIXI Application - app is null/undefined");
        }

        // Store app reference immediately to prevent race conditions
        appRef.current = app;

        // Double-check element is still valid before initializing
        const elementCheck = parentRef.current;
        if (!elementCheck || disposed) {
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

        if (disposed) {
          if (app && typeof app.destroy === "function") {
            app.destroy(true);
          }
          return;
        }

        onAppCreated(app);

        // Final check before DOM manipulation
        const finalElementCheck = parentRef.current;
        if (!finalElementCheck || disposed) {
          app.destroy(true);
          appRef.current = null;
          return;
        }

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

        initializeFPSManager(app);

        // Initialize MouseHandler for mouse-to-world coordinate conversion with visual indicator

        initializeMouseHandler(app, worldContainer, renderSprite);

        // Test the new reactive MouseHandler system

        if (mouseHandler) {
          // Test toggling to ACTIVE mode
          setTimeout(() => {
            const newState = toggleMouseHandlerState();
          }, 1000);

          // Test auto-return to IDLE mode
          setTimeout(() => {}, 3000);
        }

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

        // Create visual content for the world container (tilemap, sprites, etc.)

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

        // Initialize the rendering system

        const rendererHandler = new RendererHandler(app, worldContainer);
        rendererHandlerRef.current = rendererHandler;

        // Create visual representations for all physics entities using the rendering system

        const entities = worldHandler.getAllEntities();
        let renderersCreated = 0;

        for (const entity of entities) {
          // Create a SpriteRenderer for each entity
          const spriteRenderer = new SpriteRenderer();

          // Disable debug mode to hide red rectangles and green velocity lines
          spriteRenderer.setDebugMode(false);

          // Register the renderer with the handler
          rendererHandler.registerRenderer(entity.id, spriteRenderer);
          renderersCreated++;
        }

        // Sort children by zIndex for proper layering
        worldContainer.sortChildren();

        // Initialize the visual world update service

        visualWorldUpdateService.initialize(worldHandler, rendererHandler, worldUserId);

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
      } finally {
        initializationInProgress = false;
      }
    }

    init().catch((error) => {
      console.error("[GardenCanvas] Failed to initialize canvas:", error);
    });

    return () => {
      disposed = true;
      const app = appRef.current;

      // Clean up visual world update service

      visualWorldUpdateService.cleanup();

      // Clean up renderer handler
      if (rendererHandlerRef.current) {
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
    };
  }, [isMounted]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={parentRef} className="w-full h-full overflow-hidden" />
    </div>
  );
}

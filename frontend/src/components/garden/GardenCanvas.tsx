"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { WorldPhysicsHandler } from "@/engine/WorldPhysicsHandler";
import { constructDefaultWorld } from "@/engine/DefaultWorld";
import { initializeMouseHandler, mouseHandler } from "@/engine/input/MouseHandler";
import { initializeFPSManager } from "@/engine/input/DynamicFPSManager";

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
}: {
  onAppCreated: (app: PIXI.Application) => void;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldContainerRef = useRef<PIXI.Container | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
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

        // Enable visual mouse indicator
        console.log("[GardenCanvas] Enabling mouse position indicator...");
        if (mouseHandler) {
          mouseHandler.activate(); // This enables both logging and the red circle indicator
        }

        // Initialize World Physics Handler for entity management and physics
        console.log("[GardenCanvas] Initializing WorldPhysicsHandler for entity management...");
        const worldHandler = await constructDefaultWorld(app, worldContainer);
        console.log("[GardenCanvas] Default world constructed with entities:", {
          entityCount: worldHandler.getEntityCount(),
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
        tilemapSprite.zIndex = -100;
        tilemapTexture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
        worldContainer.addChild(tilemapSprite);

        console.log("[GardenCanvas] Tilemap added to world container:", {
          texture: tilemapTexture,
          scale: initialScale,
          position: { x: DESIGN_WIDTH / 2, y: DESIGN_HEIGHT / 2 },
          containerChildren: worldContainer.children.length,
        });

        // Create visual representations for all physics entities
        console.log("[GardenCanvas] Creating visual sprites for physics entities...");
        const entities = worldHandler.getAllEntities();
        let visualSpritesCreated = 0;

        for (const entity of entities) {
          // Check if this is a Structure entity with its own sprite
          if (entity.hasTag && entity.hasTag("structure") && (entity as any).getSprite) {
            const structureSprite = (entity as any).getSprite();
            if (structureSprite) {
              worldContainer.addChild(structureSprite);
              visualSpritesCreated++;
              continue; // Skip creating a rectangle graphic for this entity
            }
          }

          // Ensure structure objects have a sprite by setting a default spritePath if not present
          if (entity.hasTag && entity.hasTag("structure") && !(entity as any).spritePath) {
            (entity as any).spritePath = "/sprites/structure.png"; // Default sprite for structures
          }

          // Check if this entity has a custom sprite path
          if ((entity as any).spritePath) {
            try {
              const texture = await PIXI.Assets.load((entity as any).spritePath);
              const sprite = new PIXI.Sprite(texture);
              sprite.anchor.set(0.5);

              // Apply custom scaling if specified
              const scale = (entity as any).spriteScale || { x: 1, y: 1 };
              sprite.scale.set(scale.x, scale.y);

              sprite.position.set(entity.position.x, entity.position.y);
              sprite.zIndex = entity.hasTag("decoration") ? -10 : 0;

              // Set pixel-perfect rendering
              texture.source.scaleMode = "nearest";

              // Store reference on entity for updates
              (entity as any).visualSprite = sprite;

              worldContainer.addChild(sprite);
              visualSpritesCreated++;
              continue; // Skip creating a rectangle graphic for this entity
            } catch (error) {
              console.warn(`Failed to load sprite for entity ${entity.id}:`, error);
              // Fall through to create rectangle graphic as fallback
            }
          }

          // Create a red outline rectangle sprite to represent each entity
          const graphics = new PIXI.Graphics();

          // Get entity size from collider
          const entitySize = entity.collider?.size || { x: 32, y: 32 };

          // Add red outline for better visibility
          graphics.rect(-entitySize.x / 2, -entitySize.y / 2, entitySize.x, entitySize.y);
          graphics.stroke({ color: 0xff0000, width: 2 });

          // Position the graphics at entity position
          graphics.position.set(entity.position.x, entity.position.y);
          graphics.zIndex = entity.hasTag("ground") ? -50 : 0; // Ground behind other objects

          // Store reference on entity for updates
          (entity as any).visualSprite = graphics;

          worldContainer.addChild(graphics);
          visualSpritesCreated++;
        }

        console.log("[GardenCanvas] Visual sprites created:", {
          entitiesCount: entities.length,
          visualSpritesCreated,
          totalWorldContainerChildren: worldContainer.children.length,
        });

        // Sort children by zIndex for proper layering
        worldContainer.sortChildren();

        // TODO: Add more visual entities to worldContainer as needed
        // The WorldPhysicsHandler will manage physics entities independently
        // but we can sync visual elements with physics entities when needed

        // Use the app's built-in ticker for FPS management integration
        const ticker = app.ticker; // Use app's ticker instead of creating new one
        ticker.minFPS = 3; // Set reasonable minimum
        ticker.maxFPS = 60; // Set reasonable maximum (will be controlled by DynamicFPSManager)

        let isActiveTab = true;
        let needsInitialRender = true; // Flag to ensure initial render
        let renderCount = 0; // Debug counter

        // game render loop - WorldPhysicsHandler handles entity updates automatically
        ticker.add(() => {
          if (disposed) return;
          if (!isActiveTab) return;

          // Sync visual sprites with physics entity positions (physics updates automatically)
          const entities = worldHandler.getAllEntities();
          for (const entity of entities) {
            // Handle Structure entities with their own sprites
            if (
              entity.hasTag &&
              entity.hasTag("structure") &&
              (entity as any).updateSpritePosition
            ) {
              (entity as any).updateSpritePosition();
              continue;
            }

            // Handle regular visual sprites
            const visualSprite = (entity as any).visualSprite;
            if (visualSprite && entity.position) {
              // Update visual sprite position to match physics entity
              visualSprite.position.set(entity.position.x, entity.position.y);
            }
          }

          // Check if any entities have changed and need re-rendering, OR if we need initial render
          const hasEntityChanges = worldHandler.hasChanges();
          const shouldRender = needsInitialRender || hasEntityChanges;

          if (!shouldRender) return;

          renderCount++;
          if (renderCount <= 5 || renderCount % 60 === 0) {
            // Log first 5 renders and every 60th
            console.log(`[GardenCanvas] Rendering frame ${renderCount}:`, {
              needsInitialRender,
              hasEntityChanges,
              worldContainerChildren: worldContainer.children.length,
            });
          }

          // Render world container to the render texture (framebuffer)
          app.renderer.render(worldContainer, { renderTexture });

          // Render the final result to screen
          app.renderer.render(app.stage);

          // Reset flags after rendering
          if (hasEntityChanges) {
            worldHandler.resetAllChanges();
          }
          needsInitialRender = false; // Clear initial render flag after first render
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

      console.log("[GardenCanvas] Cleanup completed");
    };
  }, [isMounted]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={parentRef} className="w-full h-full overflow-hidden" />
    </div>
  );
}

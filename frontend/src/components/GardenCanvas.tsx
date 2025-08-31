"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { loadTextFile } from "@/engine/utils";
import { Assets } from "pixi.js";

export const FRAMERATE = 12;

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

  // World/camera settings
  const WORLD_WIDTH = 32 * 16; // Your tilemap size
  const WORLD_HEIGHT = 32 * 16;
  const WORLD_OFFSET = { x: 128 - 16 * 2, y: 128 };
  const SCALE = 2.3; // How much to scale up the render texture
  const DAY_DURATION = 60.0 * 2.0; // 2 minutes

  const WATER_TILE_ID = "13";

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
    let worldOffsetX = 0;
    let worldOffsetY = 0;

    async function init() {
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

        // Manual resize handler to ensure canvas matches parent
        const handleResize = () => {
          if (disposed || !parentRef.current) return;
          const parent = parentRef.current;
          app.renderer.resize(parent.clientWidth, parent.clientHeight);
        };

        // Set up resize observer for responsive behavior
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(elementCheck);
        resizeObserverRef.current = resizeObserver;

        finalElementCheck.appendChild(app.canvas);

        // ------------------------------------------------------------------------------ //
        // Removed framebuffer and updated to draw tilemapSprite directly to the app world
        const tilemapTexture = await Assets.load("/level/map.png");
        const tilemapSprite = new PIXI.Sprite(tilemapTexture);

        // Center the tilemapSprite in the app world
        tilemapSprite.anchor.set(0.5);
        tilemapSprite.position.set(app.screen.width / 2, app.screen.height / 2);
        app.stage.addChild(tilemapSprite);

        // Update resize handler to center tilemapSprite directly
        const onResize = () => {
          tilemapSprite.position.set(app.screen.width / 2, app.screen.height / 2);
          app.stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);

          // new scale
          const spriteScale = (app.screen.width * 0.9) / tilemapTexture.width;
          tilemapSprite.scale.set(spriteScale);
        };
        app.renderer.on("resize", onResize);

        // Call resize initially to set proper scale
        onResize();

        // Reintroduce missing variables and logic
        let running = false;
        let loopTimeout: ReturnType<typeof setTimeout> | null = null;
        let lastOverlayTick = 0;
        const goalParallax = { x: 0, y: 0 };
        let isMouseInside = false;

        const getCurrentFps = () => (isMouseInside ? FRAMERATE : 2);

        // Update game loop to include reintroduced variables
        const gameLoop = () => {
          if (disposed || !running) return;

          // If mouse is not inside, slowly return to center
          if (!isMouseInside) {
            goalParallax.x *= 0.95;
            goalParallax.y *= 0.95;
          }

          // Smoothly interpolate current position toward goal (velocity-based)
          const lerpFactor = 0.08;
          worldOffsetX += (goalParallax.x - worldOffsetX) * lerpFactor;
          worldOffsetY += (goalParallax.y - worldOffsetY) * lerpFactor;

          // Update tilemapSprite position for parallax effect
          tilemapSprite.x = Math.round(app.screen.width / 2 + worldOffsetX);
          tilemapSprite.y = Math.round(app.screen.height / 2 + worldOffsetY);

          // Schedule next frame with current FPS
          const fps = getCurrentFps();
          loopTimeout = setTimeout(gameLoop, 1000 / fps);
        };

        const startLoop = () => {
          if (!running) {
            running = true;
            lastOverlayTick = 0;
            gameLoop();
          }
        };

        const stopLoop = () => {
          running = false;
          if (loopTimeout) {
            clearTimeout(loopTimeout);
            loopTimeout = null;
          }
        };

        app.stage.on("pointerenter", () => {
          isMouseInside = true;
        });

        app.stage.on("pointerleave", () => {
          isMouseInside = false;
        });

        startLoop();

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

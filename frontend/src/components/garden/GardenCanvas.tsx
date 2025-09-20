"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { Entity } from "@/engine/physics/Entity";
import { RectangleCollider, createRectangleCollider } from "@/engine/physics/Collider";
import { loadPixelTexture, createAndAddEntity } from "@/engine/physics/EntityUtils";
import { AnimationLoader } from "@/engine/graphics/AnimationLoader";
import { CowBaby, createCowBaby } from "@/scripts/CowBabyStateMachine";

export const FRAMERATE = 6;
export const DAYLIGHT_FRAMERATE = 0.1;
export const DAY_CYCLE_TIME = 180;

export const DEFAULT_LAMP_COLOR = 0xffffff;
export const SECONDARY_LAMP_COLOR = 0xffffff;

// Ensure we're in browser environment before using ResizeObserver
const isClient = typeof window !== "undefined";
const hasResizeObserver = isClient && typeof ResizeObserver !== "undefined";

// Design constants for consistent scaling
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

export interface LightingObject {
  active: boolean;
  color: number;
  intensity: number;
  radius: number;
  position: { x: number; y: number };
}

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
        app.ticker.stop();

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
        // Create entities and colliders arrays
        const entities: Entity[] = [];
        const colliders: RectangleCollider[] = [];

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

        // base map - calculate scale once based on design width
        const tilemapTexture = await loadPixelTexture("/level/map.png");
        const tilemapSprite = new PIXI.Sprite(tilemapTexture);

        // Set initial scale based on design width
        const initialScale = (DESIGN_WIDTH / tilemapTexture.width) * 0.9; // 0.9 for some padding

        tilemapSprite.anchor.set(0.5);
        tilemapSprite.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
        tilemapSprite.scale.set(initialScale);
        tilemapSprite.zIndex = -100;
        worldContainer.addChild(tilemapSprite);

        // Create entities using helper function with consistent scaling
        const chickenCoop = await createAndAddEntity(
          worldContainer,
          entities,
          "/entities/house_chicken.png",
          DESIGN_WIDTH / 2 - 300,
          DESIGN_HEIGHT / 2 + 20,
          5
        );
        const waterBasin = await createAndAddEntity(
          worldContainer,
          entities,
          "/entities/water_basin.png",
          DESIGN_WIDTH / 2 - 250,
          DESIGN_HEIGHT / 2 + 250,
          4
        );
        const waterWell = await createAndAddEntity(
          worldContainer,
          entities,
          "/entities/water_well.png",
          DESIGN_WIDTH / 2 - 100,
          DESIGN_HEIGHT / 2 + 25,
          5
        );
        const mailbox = await createAndAddEntity(
          worldContainer,
          entities,
          "/entities/mailbox.png",
          DESIGN_WIDTH / 2 + 400,
          DESIGN_HEIGHT / 2 + 50,
          5
        );

        // Create colliders for static entities
        colliders.push(
          createRectangleCollider(
            chickenCoop.rect.position.x,
            chickenCoop.rect.position.y,
            chickenCoop.rect.area.width,
            chickenCoop.rect.area.height
          )
        );
        colliders.push(
          createRectangleCollider(
            waterBasin.rect.position.x,
            waterBasin.rect.position.y,
            waterBasin.rect.area.width,
            waterBasin.rect.area.height
          )
        );
        colliders.push(
          createRectangleCollider(
            waterWell.rect.position.x,
            waterWell.rect.position.y,
            waterWell.rect.area.width,
            waterWell.rect.area.height
          )
        );
        colliders.push(
          createRectangleCollider(
            mailbox.rect.position.x,
            mailbox.rect.position.y,
            mailbox.rect.area.width,
            mailbox.rect.area.height
          )
        );

        // Create animated entities (cow babies)
        const animatedEntities: CowBaby[] = [];
        const animationLoader = new AnimationLoader();

        // Create a few cow babies at different positions
        const cowBaby1 = await createCowBaby(
          app,
          animationLoader,
          DESIGN_WIDTH / 2 + 100,
          DESIGN_HEIGHT / 2 + 100,
          worldContainer
        );
        animatedEntities.push(cowBaby1);

        const cowBaby2 = await createCowBaby(
          app,
          animationLoader,
          DESIGN_WIDTH / 2 - 50,
          DESIGN_HEIGHT / 2 + 150,
          worldContainer
        );
        animatedEntities.push(cowBaby2);

        // Replace the manual game loop with PIXI.Ticker
        const ticker = new PIXI.Ticker(); // Use the app's built-in ticker
        ticker.minFPS = FRAMERATE / 2;
        ticker.maxFPS = FRAMERATE;

        // Array to store lights
        let isDirty = true;
        let isActiveTab = true;

        // game update loop
        ticker.add((ticker) => {
          if (disposed) return;

          // game logic -- every frame
          // Update static entities
          entities.forEach((entity) => {
            entity.update();

            // Check if entity changed and set dirty flag
            if (entity.isChanged) {
              isDirty = true;
              entity.resetChanged();
            }
          });

          // Update animated entities (cow babies)
          animatedEntities.forEach((cowBaby) => {
            cowBaby.update(ticker.deltaTime, colliders);

            // Check if cow baby changed and set dirty flag
            if (cowBaby.rigidbody.isChanged) {
              isDirty = true;
              cowBaby.rigidbody.resetChanged();
            }
          });
        });

        // game render loop
        ticker.add(() => {
          if (disposed) return;
          if (!isActiveTab) return;
          if (!isDirty) return;

          // Render world container to the render texture (framebuffer)
          app.renderer.render(worldContainer, { renderTexture });

          // Render the final result to screen
          app.renderer.render(app.stage);
          isDirty = false;
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

          isDirty = true;
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

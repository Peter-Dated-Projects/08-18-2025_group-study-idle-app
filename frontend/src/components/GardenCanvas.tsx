"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { AnimatedTile, loadLevel, updateAnimatedTiles } from "@/engine/Tilemap";
import { Filter, GlProgram } from "pixi.js";
import { loadTextFile } from "@/engine/utils";

export default function GardenCanvas({
  onAppCreated,
}: {
  onAppCreated: (app: PIXI.Application) => void;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldContainerRef = useRef<PIXI.Container | null>(null);
  const renderTextureRef = useRef<PIXI.RenderTexture | null>(null);
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
          backgroundAlpha: 0,
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
        // Create render texture (our "framebuffer")
        console.log("[GardenCanvas] Creating render texture...");
        const renderTexture = PIXI.RenderTexture.create({
          width: WORLD_WIDTH,
          height: WORLD_HEIGHT,
        });
        renderTextureRef.current = renderTexture;

        // Create sprite to display the render texture, scaled up
        const renderSprite = new PIXI.Sprite(renderTexture);

        // Center the scaled sprite on screen
        renderSprite.anchor.set(0.5);
        renderSprite.x = app.screen.width / 2;
        renderSprite.y = app.screen.height / 2;
        app.stage.addChild(renderSprite);

        // Create world container (this renders to the render texture)
        const world = new PIXI.Container();
        world.sortableChildren = true; // Enable zIndex sorting
        worldContainerRef.current = world;

        // ------------------------------------------------------------------------------ //
        // Load tilemap
        console.log("[GardenCanvas] Loading tilemap...");
        const tilemap = await loadLevel("/level/island.json");

        console.log(`Loaded ${tilemap.layers.length} layers:`);
        tilemap.layers.forEach((layer, index) => {
          console.log(
            `Layer ${index}: ${layer.name}, tiles: ${layer.tiles.length}, zIndex: ${layer.container.zIndex}`
          );

          // Manually set zIndex if it's not set properly
          layer.container.zIndex = tilemap.layers.length - index - 1; // First layer gets highest zIndex

          world.addChild(layer.container);
          console.log(`Added layer ${layer.name} with zIndex ${layer.container.zIndex}`);

          // Debug: Check if container has children
          console.log(`Layer ${layer.name} container children: ${layer.container.children.length}`);

          // do a manual sweep to find all water tiles and turn them into animated water tiles
          layer.tiles.forEach((tile, tileIndex) => {
            if (tile.id.startsWith(WATER_TILE_ID)) {
              // Find the corresponding sprite in the layer container
              const sprite = layer.container.children[tileIndex] as PIXI.Sprite;

              if (sprite && sprite instanceof PIXI.Sprite) {
                const animatedTile: AnimatedTile = {
                  ...tile,
                  animationFrames: ["13", "21", "22", "23"],
                  frameDuration: 500, // Increased duration to make animation more visible
                  currentFrame: 0,
                  lastFrameTime: performance.now(),
                  sprite: sprite, // Link to the actual sprite!
                };
                tilemap.animatedTiles.push(animatedTile);
              } else {
                console.warn(`Could not find sprite for animated tile at index ${tileIndex}`);
              }
            }
          });

          console.log(
            `Layer ${layer.name} has ${tilemap.animatedTiles.length} animated tiles total`
          );
        });

        // Force a sort after adding all layers
        world.sortChildren();

        // ------------------------------------------------------------------------------ //
        // Day/Night Cycle Filter + Lighting System

        // day/night system
        console.log("[GardenCanvas] Loading shaders...");
        const vert = await loadTextFile("/shaders/global-vertex-shader.glsl");
        const frag = await loadTextFile("/shaders/global-fragment-shader.glsl");
        const dayNightFilter = new Filter({
          glProgram: new GlProgram({
            fragment: frag,
            vertex: vert,
          }),
          resources: {
            timeUniforms: {
              uCycle: { value: DAY_DURATION / 2, type: "f32" },
              dayTint: { value: new Float32Array([1.0, 1.0, 1.0]), type: "vec3<f32>" },
              nightTint: { value: new Float32Array([0.7, 0.8, 1.05]), type: "vec3<f32>" },
              nightStrength: { value: 0.45, type: "f32" },
              desaturate: { value: 0.25, type: "f32" },
            },
          },
        });

        // Apply day/night filter to world
        world.filters = [dayNightFilter];

        app.ticker.add(() => {
          const seconds = app.ticker.lastTime / 1000;
          const cycleValue = seconds / DAY_DURATION;
          dayNightFilter.resources.timeUniforms.uniforms.uCycle = cycleValue;
        });

        // ------------------------------------------------------------------------------ //
        // Add test circle at world origin (with high zIndex to ensure it's visible)
        const circle = new PIXI.Graphics();
        circle.circle(0, 0, 50);
        circle.fill(0xff0000);
        circle.zIndex = 1000; // Ensure it's on top
        world.addChild(circle);

        // ------------------------------------------------------------------------------ //
        // Center world initially with hardcoded offset
        world.x = -WORLD_OFFSET.x;
        world.y = -WORLD_OFFSET.y;

        // ------------------------------------------------------------------------------ //
        // Render function
        const renderWorld = () => {
          app.renderer.render({
            container: world,
            target: renderTexture,
            clear: true,
          });
        };

        // ------------------------------------------------------------------------------ //
        // Resize handler - scale based on render texture dimensions
        const onResize = () => {
          renderSprite.x = app.screen.width / 2;
          renderSprite.y = app.screen.height / 2;

          // Calculate scale to fit the render texture to the canvas
          // This will scale the render texture (your map) to fill the canvas
          const scaleX = app.screen.width / WORLD_WIDTH;
          const scaleY = app.screen.height / WORLD_HEIGHT;

          // Use the smaller scale to maintain aspect ratio
          const scale = Math.max(scaleX, scaleY);
          renderSprite.scale.set(scale);

          app.stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
        };
        app.renderer.on("resize", onResize);

        // Call resize initially to set proper scale
        onResize();

        // ------------------------------------------------------------------------------ //
        // Input handling
        app.stage.eventMode = "static";
        app.stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);

        let dragging = false;
        const last = { x: 0, y: 0 };

        // ------------------------------------------------------------------------------ //
        // create a parallax effect when mouse is inside of the game rect. else, slowly move back to 0 parallax
        let currentParallax = { x: 0, y: 0 };
        let goalParallax = { x: 0, y: 0 };
        let isMouseInside = false;

        app.stage.on("pointermove", (e) => {
          if (app.stage.hitArea?.contains(e.global.x, e.global.y)) {
            isMouseInside = true;

            // Calculate mouse position relative to screen center
            const screenCenterX = app.screen.width / 2;
            const screenCenterY = app.screen.height / 2;
            const mouseX = e.global.x - screenCenterX;
            const mouseY = e.global.y - screenCenterY;

            // Calculate distance from center as a normalized value (0 at center, 1 at edges)
            const maxDistance = Math.sqrt(
              screenCenterX * screenCenterX + screenCenterY * screenCenterY
            );
            const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
            const normalizedDistance = Math.min(distance / maxDistance, 1.0);

            // Apply decay based on distance from center (stronger effect at center, weaker at edges)
            const decayFactor = 1.0 - normalizedDistance * 0.7; // 0.7 reduces effect at edges

            // Calculate parallax offset based on mouse position relative to center
            const parallaxStrength = 20; // Max pixels of parallax offset
            goalParallax.x = (mouseX / screenCenterX) * parallaxStrength * decayFactor;
            goalParallax.y = (mouseY / screenCenterY) * parallaxStrength * decayFactor;
          } else {
            isMouseInside = false;
          }
        });

        // Handle mouse leaving the game area
        app.stage.on("pointerleave", () => {
          isMouseInside = false;
        });

        // ------------------------------------------------------------------------------ //
        // Render loop
        const gameLoop = () => {
          if (disposed) return;

          // Update animated tiles BEFORE rendering
          updateAnimatedTiles(tilemap);

          renderWorld();

          // If mouse is not inside, slowly return to center
          if (!isMouseInside) {
            goalParallax.x *= 0.95; // Decay toward 0
            goalParallax.y *= 0.95;
          }

          // Smoothly interpolate current position toward goal (velocity-based)
          const lerpFactor = 0.08; // Adjust for smoother/snappier movement
          worldOffsetX += (goalParallax.x - worldOffsetX) * lerpFactor;
          worldOffsetY += (goalParallax.y - worldOffsetY) * lerpFactor;

          // Apply the offset to world container with hardcoded base offset
          if (worldContainerRef.current) {
            worldContainerRef.current.x = Math.round(-WORLD_OFFSET.x - worldOffsetX);
            worldContainerRef.current.y = Math.round(-WORLD_OFFSET.y - worldOffsetY);
          }

          requestAnimationFrame(gameLoop);
        };

        // ------------------------------------------------------------------------------ //
        console.log("[GardenCanvas] Starting game loop...");
        gameLoop();

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
        renderTextureRef.current = null;

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
      renderTextureRef.current = null;

      console.log("[GardenCanvas] Cleanup completed");
    };
  }, [isMounted]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={parentRef} className="w-full h-full overflow-hidden" />
    </div>
  );
}

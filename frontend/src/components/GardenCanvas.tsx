"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { AnimatedTile, loadLevel, updateAnimatedTiles } from "@/engine/Tilemap";
import { Filter, GlProgram } from "pixi.js";
import { loadTextFile } from "@/engine/utils";
import { LightingSystem } from "@/engine/LightingSystem";
import { createLightFromPreset } from "@/engine/LightPresets";

export default function GardenCanvas() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldContainerRef = useRef<PIXI.Container | null>(null);
  const renderTextureRef = useRef<PIXI.RenderTexture | null>(null);
  const lightingSystemRef = useRef<LightingSystem | null>(null);

  // World/camera settings
  const WORLD_WIDTH = 32 * 16; // Your tilemap size
  const WORLD_HEIGHT = 32 * 16;
  const WORLD_OFFSET = { x: 128 - 16 * 2, y: 128 };
  const SCALE = 2.3; // How much to scale up the render texture
  const DAY_DURATION = 60.0 * 2.0; // 2 minutes

  const WATER_TILE_ID = "13";

  useEffect(() => {
    const el = parentRef.current;
    if (!el || appRef.current) return;

    let disposed = false;
    let worldOffsetX = 0;
    let worldOffsetY = 0;

    async function init() {
      // ------------------------------------------------------------------------------ //
      const app = new PIXI.Application();
      appRef.current = app;

      await app.init({
        resizeTo: el,
        backgroundAlpha: 0,
        antialias: false, // Disable for pixel-perfect scaling
        preference: "webgl",
      });

      if (disposed) return;
      el.appendChild(app.canvas);

      // ------------------------------------------------------------------------------ //
      // Create render texture (our "framebuffer")
      const renderTexture = PIXI.RenderTexture.create({
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
      });
      renderTextureRef.current = renderTexture;

      // Create sprite to display the render texture, scaled up
      const renderSprite = new PIXI.Sprite(renderTexture);
      renderSprite.scale.set(SCALE);

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
      const tilemap = await loadLevel("/island.json");

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
              // console.log(
              //   `Created animated water tile at (${tile.x}, ${tile.y}) with sprite:`,
              //   sprite
              // );
            } else {
              console.warn(`Could not find sprite for animated tile at index ${tileIndex}`);
            }
          }
        });

        console.log(`Layer ${layer.name} has ${tilemap.animatedTiles.length} animated tiles total`);
      });

      // Force a sort after adding all layers
      world.sortChildren();

      // ------------------------------------------------------------------------------ //
      // Day/Night Cycle Filter + Lighting System

      // day/night system
      const vert = await loadTextFile("/global-vertex-shader.glsl");
      const frag = await loadTextFile("/global-fragment-shader.glsl");
      const dayNightFilter = new Filter({
        glProgram: new GlProgram({
          fragment: frag,
          vertex: vert,
        }),
        resources: {
          timeUniforms: {
            uCycle: { value: 1.0, type: "f32" },
            dayTint: { value: new Float32Array([1.0, 1.0, 1.0]), type: "vec3<f32>" },
            nightTint: { value: new Float32Array([0.7, 0.8, 1.05]), type: "vec3<f32>" },
            nightStrength: { value: 0.45, type: "f32" },
            desaturate: { value: 0.25, type: "f32" },
          },
        },
      });

      // lighting system
      const lightingSystem = await LightingSystem.create(world, tilemap);
      lightingSystemRef.current = lightingSystem;

      // Create some test lights
      const torchLight1 = lightingSystem.createLight({
        x: 200,
        y: 200,
        color: [1.0, 0.7, 0.4], // Warm orange
        intensity: 1.2,
        radius: 80,
        castShadows: true,
      });

      const campfireLight = lightingSystem.createLight({
        x: 400,
        y: 300,
        color: [1.0, 0.6, 0.2], // Orange-red
        intensity: 1.5,
        radius: 120,
        castShadows: true,
      });

      const magicalLight = lightingSystem.createLight({
        x: 600,
        y: 150,
        color: [0.7, 0.9, 1.0], // Cool blue
        intensity: 1.3,
        radius: 90,
        castShadows: false,
      });

      // Set ambient lighting (lower for dramatic effect)
      lightingSystem.setAmbientLighting(0.15, [0.3, 0.3, 0.5]);

      // apply both filters to container (day/night + lighting)
      world.filters = [dayNightFilter];

      app.ticker.add(() => {
        const seconds = app.ticker.lastTime / 1000;
        // 60.0s for a full day/night cycle
        const cycleValue = seconds / DAY_DURATION;
        dayNightFilter.resources.timeUniforms.uniforms.uCycle = cycleValue;

        // Update lighting system
        lightingSystem.update();

        // Add some animation to lights for testing
        lightingSystem.flickerLight(torchLight1.id, 0.15);
        lightingSystem.pulseLight(campfireLight.id, seconds, 0.5, 1.2);
        lightingSystem.pulseLight(magicalLight.id, seconds, 0.8, 1.5);
      });

      // ------------------------------------------------------------------------------ //
      // Add test circle at world origin (with high zIndex to ensure it's visible)
      const circle = new PIXI.Graphics();
      circle.fill(0xff0000);
      circle.circle(0, 0, 50);
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
      // Resize handler
      const onResize = () => {
        renderSprite.x = app.screen.width / 2;
        renderSprite.y = app.screen.height / 2;
        app.stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
      };
      app.renderer.on("resize", onResize);

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
        // Update animated tiles BEFORE rendering
        updateAnimatedTiles(tilemap);

        renderWorld();
        if (!disposed) {
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
        }
      };

      // ------------------------------------------------------------------------------ //
      gameLoop();
    }

    init();

    return () => {
      disposed = true;
      const app = appRef.current;
      if (app) {
        app.stage.removeAllListeners();
        app.renderer.removeAllListeners();

        if (renderTextureRef.current) {
          renderTextureRef.current.destroy(true);
        }

        if (worldContainerRef.current) {
          worldContainerRef.current.destroy({ children: true });
        }

        if (lightingSystemRef.current) {
          lightingSystemRef.current.destroy();
        }

        app.destroy(true);
        appRef.current = null;
        worldContainerRef.current = null;
        renderTextureRef.current = null;
        lightingSystemRef.current = null;
      }

      const elNow = parentRef.current;
      if (elNow?.firstChild) {
        elNow.removeChild(elNow.firstChild);
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={parentRef} className="w-full h-full overflow-hidden" />
    </div>
  );
}

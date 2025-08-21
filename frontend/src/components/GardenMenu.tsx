import { useRef, useState, useEffect } from "react";
import * as PIXI from "pixi.js";
import { AnimationLoader, AnimatedSpriteWrapper } from "@/engine/AnimationLoader";
import { CharacterAnimation } from "@/engine/CharacterAnimation";
import { buildAvatarStateMachine, CheerIdleAnimationState } from "@/scripts/AvatarStateMachine";
import {
  updateSignals,
  registerSignalHandler,
  unregisterSignalHandler,
  emitSignal,
} from "@/engine/GlobalSignalHandler";
import { AvatarSignalHandler } from "@/scripts/AvatarSignalHandler";
import "@/utils/AvatarSignals"; // Import for console testing functions

interface MenuTextures {
  avatar: PIXI.RenderTexture | null;
  inventory: PIXI.RenderTexture | null;
  stats: PIXI.RenderTexture | null;
}

interface GardenMenuProps {
  // Accept the main PIXI app from GardenCanvas
  pixiApp?: PIXI.Application;
}

export default function GardenMenu({ pixiApp }: GardenMenuProps) {
  const canvasRefs = {
    avatar: useRef<HTMLCanvasElement>(null),
    inventory: useRef<HTMLCanvasElement>(null),
    stats: useRef<HTMLCanvasElement>(null),
  };

  const [menuTextures, setMenuTextures] = useState<MenuTextures>({
    avatar: null,
    inventory: null,
    stats: null,
  });

  const [avatarBackgroundTexture, setAvatarBackgroundTexture] = useState<PIXI.Texture | null>(null);
  const avatarContainerRef = useRef<PIXI.Container | null>(null);
  const animationLoaderRef = useRef<AnimationLoader | null>(null);
  const characterAnimationRef = useRef<CharacterAnimation | null>(null);
  const avatarSignalHandlerRef = useRef<AvatarSignalHandler | null>(null);

  // Menu containers for different UI elements
  const menuContainers = useRef<{
    avatar: PIXI.Container;
    inventory: PIXI.Container;
    stats: PIXI.Container;
  } | null>(null);

  useEffect(() => {
    if (!pixiApp) return;

    const initMenus = async () => {
      // CRITICAL: Wait for PIXI renderer to be fully ready
      await new Promise((resolve) => {
        // Check if renderer is ready by testing basic functionality
        const testRenderTexture = PIXI.RenderTexture.create({ width: 1, height: 1 });
        try {
          const testContainer = new PIXI.Container();
          pixiApp.renderer.render({ container: testContainer, target: testRenderTexture });
          testRenderTexture.destroy();
          resolve(undefined);
        } catch (error) {
          // Renderer not ready, wait and try again
          setTimeout(() => {
            const checkRenderer = () => {
              try {
                const testContainer = new PIXI.Container();
                pixiApp.renderer.render({ container: testContainer, target: testRenderTexture });
                testRenderTexture.destroy();
                resolve(undefined);
              } catch (error) {
                requestAnimationFrame(checkRenderer);
              }
            };
            requestAnimationFrame(checkRenderer);
          }, 100);
        }
      });

      // Load assets
      const avatarTexture = await PIXI.Assets.load("/avatar-box.png");

      // Create containers for each menu section
      menuContainers.current = {
        avatar: new PIXI.Container(),
        inventory: new PIXI.Container(),
        stats: new PIXI.Container(),
      };

      // Setup avatar container with character animation
      // First add the avatar-box as background
      const avatarSprite = new PIXI.Sprite(avatarTexture);
      avatarSprite.anchor.set(0.5);
      avatarSprite.position.set(75, 75); // Center in 150x150 area
      avatarSprite.width = 200;
      avatarSprite.height = 200;
      // Enable pixel perfect sampling for avatar-box
      avatarSprite.texture.source.scaleMode = "nearest";
      menuContainers.current.avatar.addChild(avatarSprite);

      // Load emoticons animation
      const animationLoader = new AnimationLoader();
      animationLoaderRef.current = animationLoader;

      try {
        const characterAnimation = await buildAvatarStateMachine(pixiApp, animationLoader);

        // Store the character animation reference for updates
        characterAnimationRef.current = characterAnimation;

        // Create and register the avatar signal handler
        const avatarHandler = new AvatarSignalHandler(characterAnimation);
        avatarSignalHandlerRef.current = avatarHandler;
        registerSignalHandler(avatarHandler);

        // Get the sprite and configure it
        const characterSprite = characterAnimation.getSprite();
        characterSprite.anchor.set(0.5);
        characterSprite.position.set(75, 75);
        characterSprite.width = 100; // Match the canvas size
        characterSprite.height = 100; // Match the canvas size

        // Ensure pixel-perfect rendering (no antialiasing)
        characterSprite.texture.source.scaleMode = "nearest";

        // Add to container
        menuContainers.current.avatar.addChild(characterSprite);
      } catch (error) {
        console.error("Failed to setup character animation:", error);
        // Avatar-box is already added as fallback
      } // Force bounds calculation
      menuContainers.current.avatar.getBounds();

      // Setup other menu containers (placeholder content)
      setupMenuContainer(menuContainers.current.inventory, "Inventory", 0x4444ff);
      setupMenuContainer(menuContainers.current.stats, "Stats", 0xffff44);

      // Create render textures with nearest neighbor scaling for pixel-perfect rendering
      const newTextures: MenuTextures = {
        avatar: PIXI.RenderTexture.create({
          width: 150,
          height: 150,
          scaleMode: "nearest",
        }),
        inventory: PIXI.RenderTexture.create({
          width: 150,
          height: 150,
          scaleMode: "nearest",
        }),
        stats: PIXI.RenderTexture.create({
          width: 150,
          height: 150,
          scaleMode: "nearest",
        }),
      };

      setMenuTextures(newTextures);

      // Store reference
      avatarContainerRef.current = menuContainers.current.avatar;

      // Wait for next frame to ensure renderer is ready
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Initial render of all menu sections
      renderMenuTextures(pixiApp, menuContainers.current, newTextures);

      // CRITICAL: Ensure initial canvas update happens after everything is set up
      await new Promise((resolve) =>
        requestAnimationFrame(() => {
          updateAllCanvases(newTextures, pixiApp.renderer);
          resolve(undefined);
        })
      );
    };

    initMenus();
  }, [pixiApp]);

  // Helper function to update all canvases
  const updateAllCanvases = (textures: MenuTextures, renderer: PIXI.Renderer) => {
    Object.entries(canvasRefs).forEach(([key, ref]) => {
      if (ref.current && textures[key as keyof MenuTextures]) {
        const canvas = ref.current;
        const ctx = canvas.getContext("2d");
        if (ctx && textures[key as keyof MenuTextures]) {
          try {
            const texture = textures[key as keyof MenuTextures]!;
            // CRITICAL: Check if texture has valid data before attempting update
            if (texture.width > 0 && texture.height > 0) {
              updateCanvasFromTexture(ctx, canvas, texture, renderer);
            }
          } catch (error) {
            console.error(`❌ Failed to update ${key} canvas:`, error);
          }
        }
      }
    });
  };

  // Update menu textures periodically
  useEffect(() => {
    if (!pixiApp || !menuContainers.current || !menuTextures.avatar) return;

    const updateInterval = setInterval(() => {
      // Process global signals first
      updateSignals();

      // Update character animation state machine
      if (characterAnimationRef.current) {
        characterAnimationRef.current.update(1 / 16); // 16 FPS delta time
      }

      renderMenuTextures(pixiApp, menuContainers.current!, menuTextures);
      updateAllCanvases(menuTextures, pixiApp.renderer);
    }, 1000 / 16); // 16 FPS for UI updates

    return () => {
      clearInterval(updateInterval);

      // Cleanup signal handler
      if (avatarSignalHandlerRef.current) {
        unregisterSignalHandler(avatarSignalHandlerRef.current);
        avatarSignalHandlerRef.current = null;
      }

      // Cleanup animation resources
      if (characterAnimationRef.current) {
        characterAnimationRef.current.destroy();
        characterAnimationRef.current = null;
      }

      if (animationLoaderRef.current) {
        animationLoaderRef.current.destroy();
        animationLoaderRef.current = null;
      }
    };
  }, [pixiApp, menuTextures]);

  // Handle avatar click to trigger cheer animation
  const handleAvatarClick = () => {
    emitSignal("avatarCharacterClicked");
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        gridTemplateAreas: `
          "topleft topcenter topright"
          "middleleft middlecenter middleright"
          "bottomleft bottomcenter bottomright"
        `,
        pointerEvents: "none",
      }}
    >
      {/* Avatar */}
      <div style={{ gridArea: "topleft", pointerEvents: "auto" }}>
        <canvas
          ref={canvasRefs.avatar}
          width={150}
          height={150}
          onClick={handleAvatarClick}
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "150px",
            maxHeight: "150px",
            objectFit: "contain",
            border: "1px solid #333", // Debug border
            imageRendering: "pixelated" as any, // Disable antialiasing for crisp pixels
          }}
        />
      </div>

      {/* Empty top center */}
      <div style={{ gridArea: "topcenter" }}></div>

      {/* Empty top right */}
      <div style={{ gridArea: "topright" }}></div>

      {/* Inventory */}
      <div style={{ gridArea: "middleleft", pointerEvents: "auto" }}>
        <canvas
          ref={canvasRefs.inventory}
          width={150}
          height={150}
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "150px",
            maxHeight: "150px",
            objectFit: "contain",
            border: "1px solid #333",
          }}
        />
      </div>

      {/* Center area - transparent for gameplay */}
      <div style={{ gridArea: "middlecenter" }}></div>

      {/* Stats */}
      <div style={{ gridArea: "middleright", pointerEvents: "auto" }}>
        <canvas
          ref={canvasRefs.stats}
          width={150}
          height={150}
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "150px",
            maxHeight: "150px",
            objectFit: "contain",
            border: "1px solid #333",
          }}
        />
      </div>

      {/* Empty bottom areas */}
      <div style={{ gridArea: "bottomleft" }}></div>
      <div style={{ gridArea: "bottomcenter" }}></div>
      <div style={{ gridArea: "bottomright" }}></div>
    </div>
  );
}

// Helper function to setup menu containers with placeholder content
function setupMenuContainer(container: PIXI.Container, text: string, color: number) {
  // Make sure container has proper bounds
  container.x = 0;
  container.y = 0;

  const bg = new PIXI.Graphics();
  // Updated for PIXI v8: Draw shape first, then fill
  bg.rect(0, 0, 150, 150); // Changed to 150x150 to match render texture size
  bg.fill({ color: color, alpha: 0.5 });
  container.addChild(bg);

  // Updated for PIXI v8: Use new Text constructor syntax
  const textSprite = new PIXI.Text({
    text: text,
    style: {
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
    },
  });
  textSprite.anchor.set(0.5);
  textSprite.x = 75;
  textSprite.y = 75; // Changed to center in 150x150 area
  container.addChild(textSprite);

  // Force calculate bounds to ensure container has proper dimensions
  container.getBounds();
}

// Helper function to render all menu containers to their respective textures
function renderMenuTextures(app: PIXI.Application, containers: any, textures: MenuTextures) {
  Object.entries(containers).forEach(([key, container]) => {
    const texture = textures[key as keyof MenuTextures];
    if (texture && container) {
      try {
        // Ensure container is visible and has content
        const cont = container as PIXI.Container;

        // Make sure container is visible
        cont.visible = true;
        cont.alpha = 1.0;

        // Render to texture
        app.renderer.render({
          container: cont,
          target: texture,
          clear: true,
        });
      } catch (error) {
        console.error(`❌ Failed to render ${key}:`, error);
      }
    }
  });
}

function updateCanvasFromTexture(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  texture: PIXI.RenderTexture,
  renderer: PIXI.Renderer
) {
  // Disable image smoothing for pixel-perfect rendering
  (ctx as any).imageSmoothingEnabled = false;
  (ctx as any).webkitImageSmoothingEnabled = false;
  (ctx as any).mozImageSmoothingEnabled = false;
  (ctx as any).msImageSmoothingEnabled = false;

  try {
    // First check if texture has valid dimensions
    if (texture.width === 0 || texture.height === 0) {
      return;
    }

    // Try canvas extraction first (more reliable)
    const extractResult = renderer.extract.canvas(texture);

    // Check if we got a valid canvas-like object
    if (extractResult && extractResult.width > 0 && extractResult.height > 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Cast to any to avoid type issues with PIXI's ICanvas vs HTMLCanvasElement
      ctx.drawImage(extractResult as any, 0, 0);
      return;
    }
  } catch (error) {
    try {
      // Fallback to pixel extraction
      const pixels = renderer.extract.pixels(texture);

      // Convert to proper array format for newer PIXI versions
      const pixelArray = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels as any);

      if (pixelArray.length === 0) {
        return;
      }

      // Convert to Uint8ClampedArray for ImageData
      const clampedPixels = new Uint8ClampedArray(pixelArray);

      // Create ImageData with proper parameters
      const imageData = new ImageData(clampedPixels, texture.width, texture.height);

      // Clear and draw to canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(imageData, 0, 0);
    } catch (fallbackError) {
      console.error("Both texture extraction methods failed:", fallbackError);
    }
  }
}

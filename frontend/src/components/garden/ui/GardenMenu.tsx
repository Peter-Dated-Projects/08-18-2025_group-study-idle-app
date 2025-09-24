import { useRef, useState, useEffect } from "react";
import * as PIXI from "pixi.js";
import { AnimationLoader, AnimatedSpriteWrapper } from "@/engine/graphics/AnimationLoader";
import { CharacterAnimation } from "@/engine/graphics/AnimationStateMachine";
import { buildAvatarStateMachine } from "@/scripts/AvatarStateMachine";
import {
  updateSignals,
  registerSignalHandler,
  unregisterSignalHandler,
  emitSignal,
} from "@/engine/scripts/GlobalSignalHandler";
import { AvatarSignalHandler } from "@/scripts/AvatarSignalHandler";
import "@/utils/AvatarSignals"; // Import for console testing functions

import { AVATAR_BOX } from "../../constants";
import { FRAMERATE } from "../GardenCanvas";
import PlayerChat from "./PlayerChat";
import BankBalance from "./BankBalance";
import { BsFillCartFill } from "react-icons/bs";

interface MenuTextures {
  avatar: PIXI.RenderTexture | null;
  inventory: PIXI.RenderTexture | null;
}

interface GardenMenuProps {
  // Accept the main PIXI app from GardenCanvas
  pixiApp?: PIXI.Application;
  // Whether the user is currently in a lobby
  isInLobby?: boolean;
  // Current lobby code for clearing chat when switching lobbies
  lobbyCode?: string;
  // Handler to open the shop modal
  onShopClick?: () => void;
}

export default function GardenMenu({ pixiApp, isInLobby = false, lobbyCode, onShopClick }: GardenMenuProps) {
  const canvasRefs = {
    avatar: useRef<HTMLCanvasElement>(null),
    inventory: useRef<HTMLCanvasElement>(null),
    stats: useRef<HTMLCanvasElement>(null),
  };

  const [menuTextures, setMenuTextures] = useState<MenuTextures>({
    avatar: null,
    inventory: null,
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
      const avatarTexture = await PIXI.Assets.load(AVATAR_BOX);

      // Create containers for each menu section
      menuContainers.current = {
        avatar: new PIXI.Container(),
        inventory: new PIXI.Container(),
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

      // Enable caching for menu containers
      Object.values(menuContainers.current).forEach((container) => {
        container.cacheAsTexture(true);
      });

      // Function to update cache textures for all containers
      const updateCacheTextures = () => {
        Object.values(menuContainers.current!).forEach((container) => {
          container.updateCacheTexture();
        });
      };
      updateCacheTextures();
    };

    initMenus();
  }, [pixiApp]);

  // Helper function to update all canvases
  const updateAllCanvases = (textures: MenuTextures, renderer: PIXI.Renderer) => {
    // Add null check for renderer
    if (!renderer) {
      console.warn("⚠️ PIXI Renderer is null, skipping canvas updates");
      return;
    }

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
    if (!pixiApp || !pixiApp.renderer || !menuContainers.current || !menuTextures.avatar) return;

    const updateInterval = setInterval(() => {
      // Process global signals first
      updateSignals();

      // Update character animation state machine
      if (characterAnimationRef.current) {
        characterAnimationRef.current.update(1 / 16); // 16 FPS delta time
      }

      // Additional safety checks before rendering
      if (pixiApp && pixiApp.renderer && menuContainers.current) {
        renderMenuTextures(pixiApp, menuContainers.current!, menuTextures);
        updateAllCanvases(menuTextures, pixiApp.renderer);
      }
    }, 1000 / FRAMERATE); // 12 FPS for UI updates

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

  const handleShopClick = () => {
    if (onShopClick) {
      onShopClick();
    }
  };

  return (
    <div
      className="
      absolute inset-0 z-[1000] 
      grid grid-cols-3 grid-rows-3 
      pointer-events-none
      "
      style={{
        gridTemplateAreas: `
        "topleft topcenter topright"
        "middleleft middlecenter middleright"
        "bottomleft bottomcenter bottomright"
      `,
      }}
    >
      {/* Avatar and Bank Balance */}
      <div
        style={{
          gridArea: "topleft",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
          maxWidth: "150px",
        }}
      >
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
            // border: "1px solid #333", // Debug border
            imageRendering: "pixelated" as const, // Disable antialiasing for crisp pixels
            pointerEvents: "auto", // Enable pointer events for avatar click
          }}
        />

        {/* Bank Balance Component */}
        <BankBalance />
        
        {/* Shop Icon Button */}
        <button
          onClick={handleShopClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            backgroundColor: "#2d3748",
            border: "1px solid #4a5568",
            borderRadius: "8px",
            fontSize: "0.9rem",
            color: "#e2e8f0",
            cursor: "pointer",
            pointerEvents: "auto",
            width: "150px", // Fixed width to match avatar and balance
            marginLeft: "2px",
            boxSizing: "border-box",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#4a5568";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#2d3748";
          }}
        >
          <BsFillCartFill
            style={{
              fontSize: "1.2rem",
              color: "#f6e05e",
              display: "flex",
              alignItems: "center",
            }}
          />
          <span style={{ fontWeight: "bold" }}>Shop</span>
        </button>
      </div>

      {/* PlayerChat - spans bottom left and bottom center */}
      <div
        style={{
          gridColumn: "1 / 3", // spans from column 1 to column 3 (so columns 1 and 2)
          gridRow: "3", // bottom row only
          pointerEvents: "none",
          display: "flex",
          alignItems: "stretch",
        }}
      >
        <PlayerChat isInLobby={isInLobby} lobbyCode={lobbyCode} />
      </div>
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
function renderMenuTextures(
  app: PIXI.Application,
  containers: Record<string, PIXI.Container>,
  textures: MenuTextures
) {
  // Add null check for renderer
  if (!app || !app.renderer) {
    console.warn("⚠️ PIXI Application or renderer is null, skipping texture rendering");
    return;
  }

  Object.entries(containers).forEach(([key, container]) => {
    const texture = textures[key as keyof MenuTextures];
    if (texture && container) {
      try {
        // Ensure container is visible and has content
        const cont = container as PIXI.Container;

        // Make sure container is visible
        cont.visible = true;
        cont.alpha = 1.0;

        // Additional safety check before rendering
        if (app.renderer && typeof app.renderer.render === "function") {
          // Render to texture
          app.renderer.render({
            container: cont,
            target: texture,
            clear: true,
          });
        }
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
  // Add null checks for renderer and extract
  if (!renderer || !renderer.extract) {
    console.warn("⚠️ PIXI Renderer or extract is null, skipping canvas update");
    return;
  }

  // Disable image smoothing for pixel-perfect rendering
  const context = ctx as CanvasRenderingContext2D;
  context.imageSmoothingEnabled = false;
  (context as unknown as Record<string, boolean>).webkitImageSmoothingEnabled = false;
  (context as unknown as Record<string, boolean>).mozImageSmoothingEnabled = false;
  (context as unknown as Record<string, boolean>).msImageSmoothingEnabled = false;

  try {
    // First check if texture has valid dimensions
    if (texture.width === 0 || texture.height === 0) {
      return;
    }

    // Additional safety check for extract methods
    if (typeof renderer.extract.canvas !== "function") {
      console.warn("⚠️ Renderer extract.canvas method not available");
      return;
    }

    // Try canvas extraction first (more reliable)
    const extractResult = renderer.extract.canvas(texture);

    // Check if we got a valid canvas-like object
    if (extractResult && extractResult.width > 0 && extractResult.height > 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Cast to HTMLCanvasElement for proper typing
      ctx.drawImage(extractResult as HTMLCanvasElement, 0, 0);
      return;
    }
  } catch (error) {
    try {
      // Additional safety check for pixels method
      if (typeof renderer.extract.pixels !== "function") {
        console.warn("⚠️ Renderer extract.pixels method not available");
        return;
      }

      // Fallback to pixel extraction
      const pixels = renderer.extract.pixels(texture);

      // Convert to proper array format for newer PIXI versions
      const pixelArray =
        pixels instanceof Uint8Array
          ? pixels
          : new Uint8Array(pixels as unknown as ArrayBufferLike);

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

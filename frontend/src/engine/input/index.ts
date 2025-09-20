import * as PIXI from "pixi.js";

// Input system exports
export {
  MouseHandler,
  mouseHandler,
  initializeMouseHandler,
  mouseToWorldCoords,
  getMouseHandlerState,
  setMouseInactivityThreshold,
  getMouseInactivityThreshold,
  getWorldOffset,
} from "./MouseHandler";

export {
  DynamicFPSManager,
  fpsManager,
  initializeFPSManager,
  switchFPSPreset,
  getCurrentFPSPreset,
  getAvailableFPSPresets,
  getFPSInfo,
} from "./DynamicFPSManager";

import { mouseHandler } from "./MouseHandler";
import { fpsManager } from "./DynamicFPSManager";

// Convenience functions for global mouse handler
export const enableMouseVisualIndicator = () => {
  if (mouseHandler) {
    mouseHandler.enableVisualIndicator();
  }
};

export const disableMouseVisualIndicator = () => {
  if (mouseHandler) {
    mouseHandler.disableVisualIndicator();
  }
};

export const getCurrentMouseWorldPosition = () => {
  if (mouseHandler) {
    return mouseHandler.getCurrentWorldPosition();
  }
  return null;
};

export const isMouseInsideCanvas = () => {
  if (mouseHandler) {
    return mouseHandler.isMouseInside();
  }
  return false;
};

// FPS Management convenience functions
export const setIdleFPS = () => {
  if (fpsManager) {
    fpsManager.switchToPreset("idle");
  }
};

export const setActiveFPS = () => {
  if (fpsManager) {
    fpsManager.switchToPreset("active");
  }
};

export const getCurrentFPS = () => {
  if (fpsManager) {
    return fpsManager.getActualFPS();
  }
  return 0;
};

export const setMouseRenderSprite = (
  renderSprite: PIXI.Sprite,
  designWidth: number = 1920,
  designHeight: number = 1080
) => {
  if (mouseHandler) {
    mouseHandler.setRenderSprite(renderSprite, designWidth, designHeight);
  }
};

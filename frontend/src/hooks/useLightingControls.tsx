"use client";

import { useState, useCallback } from "react";
import { LightingSystem, Light } from "@/engine/LightingSystem";
import { createLightFromPreset } from "@/engine/LightPresets";

export function useLightingControls(lightingSystem: LightingSystem | null) {
  const [lights, setLights] = useState<Light[]>([]);

  const updateLights = useCallback(() => {
    if (lightingSystem) {
      setLights(lightingSystem.getAllLights());
    }
  }, [lightingSystem]);

  const createLight = useCallback(
    (config: { x: number; y: number; preset: string }) => {
      if (!lightingSystem) return;

      const lightConfig = createLightFromPreset(config.preset, config.x, config.y);
      lightingSystem.createLight(lightConfig as any);
      updateLights();
    },
    [lightingSystem, updateLights]
  );

  const toggleLight = useCallback(
    (lightId: string, enabled: boolean) => {
      if (!lightingSystem) return;

      lightingSystem.setLightEnabled(lightId, enabled);
      updateLights();
    },
    [lightingSystem, updateLights]
  );

  const removeLight = useCallback(
    (lightId: string) => {
      if (!lightingSystem) return;

      lightingSystem.removeLight(lightId);
      updateLights();
    },
    [lightingSystem, updateLights]
  );

  // Update lights when lighting system changes
  useState(() => {
    updateLights();
  });

  return {
    lights,
    createLight,
    toggleLight,
    removeLight,
    updateLights,
  };
}

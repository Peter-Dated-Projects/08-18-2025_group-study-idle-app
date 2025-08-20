import { Light } from "./LightingSystem";

export interface LightPreset {
  name: string;
  color: [number, number, number];
  intensity: number;
  radius: number;
  castShadows: boolean;
}

export const LightPresets: Record<string, LightPreset> = {
  torch: {
    name: "Torch",
    color: [1.0, 0.7, 0.4], // Warm orange
    intensity: 1.2,
    radius: 80,
    castShadows: true,
  },

  campfire: {
    name: "Campfire",
    color: [1.0, 0.6, 0.2], // Orange-red
    intensity: 1.5,
    radius: 120,
    castShadows: true,
  },

  lantern: {
    name: "Lantern",
    color: [1.0, 0.9, 0.7], // Soft white-yellow
    intensity: 1.0,
    radius: 100,
    castShadows: true,
  },

  candle: {
    name: "Candle",
    color: [1.0, 0.8, 0.5], // Warm yellow
    intensity: 0.8,
    radius: 50,
    castShadows: true,
  },

  magical: {
    name: "Magical",
    color: [0.7, 0.9, 1.0], // Cool blue
    intensity: 1.3,
    radius: 90,
    castShadows: false,
  },

  crystal: {
    name: "Crystal",
    color: [0.9, 0.7, 1.0], // Purple
    intensity: 1.1,
    radius: 70,
    castShadows: false,
  },

  moonlight: {
    name: "Moonlight",
    color: [0.8, 0.8, 1.0], // Cool white
    intensity: 0.6,
    radius: 200,
    castShadows: true,
  },

  sunbeam: {
    name: "Sunbeam",
    color: [1.0, 1.0, 0.9], // Bright warm white
    intensity: 1.8,
    radius: 150,
    castShadows: true,
  },

  firefly: {
    name: "Firefly",
    color: [0.8, 1.0, 0.6], // Green-yellow
    intensity: 0.5,
    radius: 30,
    castShadows: false,
  },

  ember: {
    name: "Ember",
    color: [1.0, 0.4, 0.1], // Bright orange-red
    intensity: 0.7,
    radius: 40,
    castShadows: false,
  },
};

export function createLightFromPreset(
  preset: string,
  x: number,
  y: number,
  overrides: Partial<Light> = {}
): Partial<Light> {
  const presetConfig = LightPresets[preset];
  if (!presetConfig) {
    console.warn(`Light preset '${preset}' not found, using torch preset`);
    return createLightFromPreset("torch", x, y, overrides);
  }

  return {
    x,
    y,
    color: presetConfig.color,
    intensity: presetConfig.intensity,
    radius: presetConfig.radius,
    castShadows: presetConfig.castShadows,
    enabled: true,
    ...overrides, // Apply any custom overrides
  };
}

export function getLightPresetNames(): string[] {
  return Object.keys(LightPresets);
}

// Utility function to create animated light effects
export interface LightAnimation {
  type: "flicker" | "pulse" | "breathe" | "strobe";
  intensity?: number;
  speed?: number;
  minIntensity?: number;
  maxIntensity?: number;
}

export function applyLightAnimation(light: Light, animation: LightAnimation, time: number): void {
  const baseIntensity = LightPresets[getPresetFromLight(light)]?.intensity || 1.0;

  switch (animation.type) {
    case "flicker":
      // Random flickering like a torch
      const flickerIntensity = animation.intensity || 0.2;
      const flicker = (Math.random() - 0.5) * flickerIntensity;
      light.intensity = Math.max(0.1, baseIntensity + flicker);
      break;

    case "pulse":
      // Smooth pulsing
      const pulseSpeed = animation.speed || 2.0;
      const minInt = animation.minIntensity || baseIntensity * 0.5;
      const maxInt = animation.maxIntensity || baseIntensity * 1.5;
      const pulse = Math.sin(time * pulseSpeed) * 0.5 + 0.5;
      light.intensity = minInt + (maxInt - minInt) * pulse;
      break;

    case "breathe":
      // Slow breathing effect
      const breatheSpeed = animation.speed || 1.0;
      const breatheMin = animation.minIntensity || baseIntensity * 0.7;
      const breatheMax = animation.maxIntensity || baseIntensity * 1.3;
      const breathe = Math.sin(time * breatheSpeed) * 0.5 + 0.5;
      light.intensity = breatheMin + (breatheMax - breatheMin) * breathe;
      break;

    case "strobe":
      // Strobing effect
      const strobeSpeed = animation.speed || 5.0;
      const strobeMin = animation.minIntensity || 0.1;
      const strobeMax = animation.maxIntensity || baseIntensity * 2.0;
      const strobe = Math.sin(time * strobeSpeed) > 0 ? 1 : 0;
      light.intensity = strobeMin + (strobeMax - strobeMin) * strobe;
      break;
  }
}

// Helper function to determine which preset a light matches closest to
function getPresetFromLight(light: Light): string {
  // Simple color matching to determine preset
  const [r, g, b] = light.color;

  if (r > 0.9 && g < 0.8 && b < 0.5) return "torch";
  if (r > 0.9 && g < 0.7 && b < 0.3) return "campfire";
  if (r < 0.8 && g > 0.8 && b > 0.9) return "magical";
  if (r > 0.8 && g > 0.8 && b > 0.8) return "lantern";

  return "torch"; // Default fallback
}

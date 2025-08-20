import { Filter, GlProgram, RenderTexture, Container, Graphics, Texture, Rectangle } from "pixi.js";
import { loadTextFile } from "./utils";

export interface Light {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: [number, number, number];
  intensity: number;
  castShadows: boolean;
  enabled: boolean;
}

export interface Occluder {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "wall" | "object";
}

export class LightingSystem {
  private world: Container;
  private tilemap: any;
  private lights: Map<string, Light> = new Map();
  private occluders: Occluder[] = [];
  private shadowMapTexture: RenderTexture;
  public lightingFilter!: Filter;
  private maxLights = 8;
  private nextLightId = 0;

  private constructor(world: Container, tilemap: any) {
    this.world = world;
    this.tilemap = tilemap;

    // Create shadow map render texture
    this.shadowMapTexture = RenderTexture.create({
      width: 512,
      height: 512,
    });

    // Extract occluders from tilemap
    this.extractOccluders();
  }

  static async create(world: Container, tilemap: any): Promise<LightingSystem> {
    const instance = new LightingSystem(world, tilemap);
    instance.lightingFilter = await instance.createLightingFilter();
    return instance;
  }

  private extractOccluders() {
    // Find collision layers and extract wall positions
    this.tilemap.layers.forEach((layer: any) => {
      if (layer.collider) {
        layer.tiles.forEach((tile: any) => {
          this.occluders.push({
            x: tile.x * this.tilemap.tileSize,
            y: tile.y * this.tilemap.tileSize,
            width: this.tilemap.tileSize,
            height: this.tilemap.tileSize,
            type: "wall",
          });
        });
      }
    });

    console.log(`Extracted ${this.occluders.length} occluders from tilemap`);
  }

  private async createLightingFilter(): Promise<Filter> {
    // Load shaders from external files
    const lightingVertexShader = await loadTextFile("/lighting-vertex-shader.glsl");
    const lightingFragmentShader = await loadTextFile("/lighting-fragment-shader.glsl");

    return new Filter({
      glProgram: new GlProgram({
        vertex: lightingVertexShader,
        fragment: lightingFragmentShader,
      }),
      resources: {
        lightingUniforms: {
          uLightPositions: { value: new Float32Array(16), type: "vec2<f32>" }, // 8 lights * 2 components
          uLightColors: { value: new Float32Array(24), type: "vec3<f32>" }, // 8 lights * 3 components
          uLightRadii: { value: new Float32Array(8), type: "f32" },
          uLightIntensities: { value: new Float32Array(8), type: "f32" },
          uNumLights: { value: 0, type: "i32" },
          uAmbientStrength: { value: 0.2, type: "f32" },
          uAmbientColor: { value: [0.4, 0.4, 0.6], type: "vec3<f32>" },
        },
      },
      uniforms: {
        uShadowMap: this.shadowMapTexture,
      },
    });
  }

  createLight(config: Partial<Light> & { x: number; y: number }): Light {
    const lightId = `light_${this.nextLightId++}`;

    const light: Light = {
      id: lightId,
      x: config.x,
      y: config.y,
      radius: config.radius || 100,
      color: config.color || [1.0, 0.8, 0.6], // Warm torch light by default
      intensity: config.intensity || 1.0,
      castShadows: config.castShadows || false,
      enabled: config.enabled !== false,
    };

    this.lights.set(lightId, light);
    this.updateLightUniforms();

    console.log(`Created light ${lightId} at (${light.x}, ${light.y})`);
    return light;
  }

  removeLight(lightId: string): boolean {
    const removed = this.lights.delete(lightId);
    if (removed) {
      this.updateLightUniforms();
      console.log(`Removed light ${lightId}`);
    }
    return removed;
  }

  moveLight(lightId: string, x: number, y: number): boolean {
    const light = this.lights.get(lightId);
    if (light) {
      light.x = x;
      light.y = y;
      this.updateLightUniforms();
      return true;
    }
    return false;
  }

  setLightEnabled(lightId: string, enabled: boolean): boolean {
    const light = this.lights.get(lightId);
    if (light) {
      light.enabled = enabled;
      this.updateLightUniforms();
      return true;
    }
    return false;
  }
  setAmbientLighting(strength: number, color: [number, number, number]) {
    const resources = this.lightingFilter.resources.lightingUniforms;
    resources.uniforms.uAmbientStrength = Math.max(0, Math.min(1, strength));
    resources.uniforms.uAmbientColor = color;
  }

  private updateLightUniforms() {
    const resources = this.lightingFilter.resources.lightingUniforms;
    const enabledLights = Array.from(this.lights.values()).filter((light) => light.enabled);
    const numLights = Math.min(enabledLights.length, this.maxLights);

    // Clear all light data first
    // console.log(resources);
    for (let i = 0; i < this.maxLights; i++) {
      resources.uniforms.uLightPositions[i * 2] = 0;
      resources.uniforms.uLightPositions[i * 2 + 1] = 0;
      resources.uniforms.uLightColors[i * 3] = 0;
      resources.uniforms.uLightColors[i * 3 + 1] = 0;
      resources.uniforms.uLightColors[i * 3 + 2] = 0;
      resources.uniforms.uLightRadii[i] = 0;
      resources.uniforms.uLightIntensities[i] = 0;
    }

    // Update enabled lights
    for (let i = 0; i < numLights; i++) {
      const light = enabledLights[i];
      resources.uniforms.uLightPositions[i * 2] = light.x;
      resources.uniforms.uLightPositions[i * 2 + 1] = light.y;

      resources.uniforms.uLightColors[i * 3] = light.color[0];
      resources.uniforms.uLightColors[i * 3 + 1] = light.color[1];
      resources.uniforms.uLightColors[i * 3 + 2] = light.color[2];

      resources.uniforms.uLightRadii[i] = light.radius;
      resources.uniforms.uLightIntensities[i] = light.intensity;
    }

    resources.uniforms.uNumLights = numLights;
  }

  // Generate shadow map (basic implementation for now)
  private generateShadowMap() {
    // Clear shadow map to white (no shadows)
    const graphics = new Graphics();
    graphics.clear();
    graphics.rect(0, 0, 512, 512).fill({ color: 0xffffff, alpha: 1.0 }); // White = no shadow

    // Draw occluders as black rectangles (shadows)
    for (const occluder of this.occluders) {
      // Scale world coordinates to shadow map coordinates
      const shadowX = (occluder.x / this.world.width) * 512;
      const shadowY = (occluder.y / this.world.height) * 512;
      const shadowW = (occluder.width / this.world.width) * 512;
      const shadowH = (occluder.height / this.world.height) * 512;

      graphics.rect(shadowX, shadowY, shadowW, shadowH).fill({ color: 0x000000, alpha: 1.0 });
    }
    // Render to shadow map texture
    this.world.addChild(graphics);
    // Note: You'll need access to the renderer to do this properly
    // renderer.render(graphics, { renderTexture: this.shadowMapTexture });
    this.world.removeChild(graphics);
    graphics.destroy();
  }

  update() {
    this.generateShadowMap();
  }

  // Utility methods for dynamic lighting effects
  flickerLight(lightId: string, intensity: number = 0.1) {
    const light = this.lights.get(lightId);
    if (light) {
      const baseIntensity = light.intensity;
      const flicker = (Math.random() - 0.5) * intensity;
      light.intensity = Math.max(0, baseIntensity + flicker);
      this.updateLightUniforms();
    }
  }

  pulseLight(
    lightId: string,
    time: number,
    minIntensity: number = 0.5,
    maxIntensity: number = 1.5
  ) {
    const light = this.lights.get(lightId);
    if (light) {
      const pulse = Math.sin(time * 2) * 0.5 + 0.5; // 0 to 1
      light.intensity = minIntensity + (maxIntensity - minIntensity) * pulse;
      this.updateLightUniforms();
    }
  }

  // Get all lights (for debugging or UI)
  getAllLights(): Light[] {
    return Array.from(this.lights.values());
  }

  // Add an occluder manually (for dynamic objects)
  addOccluder(occluder: Occluder) {
    this.occluders.push(occluder);
  }

  // Remove occluders (for dynamic objects)
  removeOccluder(x: number, y: number, width: number, height: number) {
    this.occluders = this.occluders.filter(
      (occ) => !(occ.x === x && occ.y === y && occ.width === width && occ.height === height)
    );
  }

  destroy() {
    this.shadowMapTexture.destroy();
    this.lights.clear();
    this.occluders.length = 0;
  }
}

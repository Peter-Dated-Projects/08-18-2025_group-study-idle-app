import * as PIXI from "pixi.js";

/**
 * Simple Mouse Indicator Test
 * This bypasses all the complex MouseHandler logic and directly creates a visual indicator
 */
export class SimpleMouseIndicator {
  private app: PIXI.Application;
  private indicator: PIXI.Graphics;
  private container: PIXI.Container;
  private isActive = false;

  constructor(app: PIXI.Application, container?: PIXI.Container) {
    this.app = app;
    this.container = container || app.stage;
    this.indicator = new PIXI.Graphics();
    this.createIndicator();
    this.setupEventListeners();
  }

  private createIndicator(): void {
    console.log("[SimpleMouseIndicator] Creating simple red circle...");

    // Clear any existing graphics
    this.indicator.clear();

    // Draw a simple red circle
    this.indicator
      .circle(0, 0, 8) // 8px radius for visibility
      .fill({ color: 0xff0000, alpha: 0.9 }); // Bright red

    this.indicator.visible = false;
    this.indicator.zIndex = 99999; // Very high z-index

    // Add to container
    this.container.addChild(this.indicator);

    console.log("[SimpleMouseIndicator] Indicator created and added to container");
  }

  private setupEventListeners(): void {
    const canvas = this.app.canvas as HTMLCanvasElement;

    canvas.addEventListener("mouseenter", () => {
      console.log("[SimpleMouseIndicator] Mouse entered");
      this.indicator.visible = true;
    });

    canvas.addEventListener("mouseleave", () => {
      console.log("[SimpleMouseIndicator] Mouse left");
      this.indicator.visible = false;
    });

    canvas.addEventListener("mousemove", (event) => {
      if (this.isActive) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        console.log(
          `[SimpleMouseIndicator] Moving to canvas coords: (${x.toFixed(1)}, ${y.toFixed(1)})`
        );
        this.indicator.position.set(x, y);
      }
    });
  }

  public activate(): void {
    console.log("[SimpleMouseIndicator] Activated");
    this.isActive = true;
  }

  public deactivate(): void {
    console.log("[SimpleMouseIndicator] Deactivated");
    this.isActive = false;
    this.indicator.visible = false;
  }

  public destroy(): void {
    this.indicator.removeFromParent();
    this.indicator.destroy();
  }
}

// Global instance for testing
let simpleIndicator: SimpleMouseIndicator | null = null;

export function createSimpleMouseIndicator(
  app: PIXI.Application,
  container?: PIXI.Container
): SimpleMouseIndicator {
  if (simpleIndicator) {
    simpleIndicator.destroy();
  }

  simpleIndicator = new SimpleMouseIndicator(app, container);
  simpleIndicator.activate();

  // Make it available globally for debugging (browser only)
  if (typeof window !== "undefined") {
    (window as any).simpleIndicator = simpleIndicator;
  }

  return simpleIndicator;
}

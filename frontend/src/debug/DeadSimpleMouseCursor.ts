import * as PIXI from "pixi.js";

/**
 * Dead Simple Mouse Cursor - bypasses all complex logic
 * This creates a simple red circle that follows the mouse using basic canvas coordinates
 */
export class DeadSimpleMouseCursor {
  private app: PIXI.Application;
  private cursor: PIXI.Graphics;
  private container: PIXI.Container;

  constructor(app: PIXI.Application, container?: PIXI.Container) {
    this.app = app;
    this.container = container || app.stage;
    this.cursor = new PIXI.Graphics();

    this.createCursor();
    this.setupEvents();

    console.log("[DeadSimpleMouseCursor] Created and active");
  }

  private createCursor(): void {
    // Create a bright red circle
    this.cursor.clear();
    this.cursor.circle(0, 0, 10); // 10px radius for visibility
    this.cursor.fill(0xff0000); // Bright red
    this.cursor.alpha = 0.8;
    this.cursor.zIndex = 999999; // Very high z-index

    // Add directly to app stage for maximum visibility
    this.app.stage.addChild(this.cursor);
    this.cursor.visible = false;

    console.log("[DeadSimpleMouseCursor] Red circle created and added to stage");
  }

  private setupEvents(): void {
    const canvas = this.app.canvas as HTMLCanvasElement;

    // Mouse enter - show cursor
    canvas.addEventListener("mouseenter", () => {
      console.log("[DeadSimpleMouseCursor] Mouse entered - showing cursor");
      this.cursor.visible = true;
    });

    // Mouse leave - hide cursor
    canvas.addEventListener("mouseleave", () => {
      console.log("[DeadSimpleMouseCursor] Mouse left - hiding cursor");
      this.cursor.visible = false;
    });

    // Mouse move - update position
    canvas.addEventListener("mousemove", (event) => {
      if (this.cursor.visible) {
        const rect = canvas.getBoundingClientRect();

        // Convert to canvas-relative coordinates
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Set position directly in screen coordinates
        this.cursor.position.set(x, y);

        // Log every 30th frame to avoid spam
        if (Math.random() < 0.03) {
          console.log(`[DeadSimpleMouseCursor] Moving to (${x.toFixed(1)}, ${y.toFixed(1)})`);
        }
      }
    });

    console.log("[DeadSimpleMouseCursor] Event listeners set up");
  }

  public destroy(): void {
    this.cursor.removeFromParent();
    this.cursor.destroy();
    console.log("[DeadSimpleMouseCursor] Destroyed");
  }
}

// Global instance
let globalCursor: DeadSimpleMouseCursor | null = null;

export function createDeadSimpleMouseCursor(app: PIXI.Application): DeadSimpleMouseCursor {
  // Remove existing cursor
  if (globalCursor) {
    globalCursor.destroy();
  }

  globalCursor = new DeadSimpleMouseCursor(app);

  // Make available for debugging
  if (typeof window !== "undefined") {
    (window as any).deadSimpleCursor = globalCursor;
  }

  return globalCursor;
}

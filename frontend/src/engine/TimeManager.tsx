/**
 * Global time management system for measuring deltaTime between world updates
 */
class TimeManager {
  private static instance: TimeManager;
  private lastTime: number = 0;
  private deltaTime: number = 0;
  private targetFPS: number = 60;
  private maxDeltaTime: number = 1 / 30; // Cap at 30 FPS minimum to prevent large jumps

  private constructor() {
    this.lastTime = performance.now();
  }

  /**
   * Get the singleton instance of TimeManager
   */
  public static getInstance(): TimeManager {
    if (!TimeManager.instance) {
      TimeManager.instance = new TimeManager();
    }
    return TimeManager.instance;
  }

  /**
   * Update the time manager - should be called once per frame
   * @param currentTime - Current timestamp in milliseconds
   */
  public update(currentTime?: number): void {
    const now = currentTime ?? performance.now();

    // Calculate deltaTime in seconds
    this.deltaTime = Math.min((now - this.lastTime) / 1000, this.maxDeltaTime);
    this.lastTime = now;
  }

  /**
   * Get the time elapsed since the last update in seconds
   * @returns deltaTime as a float in seconds
   */
  public getDeltaTime(): number {
    return this.deltaTime;
  }

  /**
   * Get the current FPS based on deltaTime
   * @returns Current frames per second
   */
  public getFPS(): number {
    return this.deltaTime > 0 ? 1 / this.deltaTime : 0;
  }

  /**
   * Set the target FPS for the application
   * @param fps - Target frames per second
   */
  public setTargetFPS(fps: number): void {
    this.targetFPS = fps;
  }

  /**
   * Get the target FPS
   * @returns Target frames per second
   */
  public getTargetFPS(): number {
    return this.targetFPS;
  }

  /**
   * Set the maximum allowed deltaTime to prevent large frame jumps
   * @param maxDelta - Maximum deltaTime in seconds
   */
  public setMaxDeltaTime(maxDelta: number): void {
    this.maxDeltaTime = maxDelta;
  }

  /**
   * Reset the time manager (useful for pause/resume scenarios)
   */
  public reset(): void {
    this.lastTime = performance.now();
    this.deltaTime = 0;
  }
}

// Export the singleton instance for easy access
export const timeManager = TimeManager.getInstance();

// Export convenience function for quick deltaTime access
export const getDeltaTime = (): number => timeManager.getDeltaTime();

export default TimeManager;

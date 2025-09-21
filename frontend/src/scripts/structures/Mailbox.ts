import { Vec2 } from "../../engine/physics";
import { Structure } from "./Structure";
import * as PIXI from "pixi.js";

/**
 * Mailbox structure - a communication hub for the farm
 * Provides mail delivery and messaging functionality
 */
export class Mailbox extends Structure {
  private mailboxTexturePath = "/entities/mailbox.png";

  constructor(position: Vec2, onClick?: (structure: Mailbox) => void) {
    super(position, onClick ? (structure) => onClick(structure as Mailbox) : undefined);

    // Add mailbox-specific tags
    this.addTag("mailbox");
    this.addTag("communication");
    this.addTag("utility");
  }

  /**
   * Override sprite initialization to use mailbox texture
   */
  public async initializeSprite(): Promise<void> {
    try {
      // Load the mailbox texture
      const texture = await PIXI.Assets.load(this.mailboxTexturePath);

      // Create sprite
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5); // Center anchor

      // Scale to fit appropriate size for mailbox (smaller than base structure)
      const scaleX = 120 / texture.width;
      const scaleY = 120 / texture.height;
      this.sprite.scale.set(scaleX, scaleY);

      // Position sprite
      this.sprite.position.set(this.position.x, this.position.y);

      // Enable interactivity
      this.sprite.interactive = true;
      this.sprite.cursor = "pointer";

      // Set up click event
      this.sprite.on("pointerdown", this.handleClick.bind(this));

      // Set pixel-perfect rendering
      texture.source.scaleMode = "nearest";

      console.log(
        `Mailbox sprite initialized at position (${this.position.x}, ${this.position.y})`
      );
    } catch (error) {
      console.error("Failed to initialize Mailbox sprite:", error);
      // Fall back to base structure sprite if mailbox texture fails
      await super.initializeSprite();
    }
  }

  /**
   * Handle mailbox-specific click interactions
   */
  protected handleClick(event: PIXI.FederatedPointerEvent): void {
    // Call parent click handler first
    super.handleClick(event);

    // Add mailbox-specific click behavior
    this.openMailbox();
  }

  /**
   * Handle mailbox-specific interactions
   */
  public openMailbox(): void {
    console.log("Opening mailbox - checking for new mail...");
    // Add mailbox-specific functionality here
    // Could check for messages, deliveries, etc.
  }

  /**
   * Send mail through the mailbox
   */
  public sendMail(recipient: string, message: string): void {
    console.log(`Sending mail to ${recipient}: ${message}`);
    // Add mail sending functionality here
  }

  /**
   * Check if there's new mail
   */
  public hasNewMail(): boolean {
    // Placeholder logic - could be connected to game state
    return Math.random() > 0.7; // 30% chance of new mail
  }

  /**
   * Static factory method to create a Mailbox with automatic sprite initialization
   */
  public static async create(
    position: Vec2,
    onClick?: (mailbox: Mailbox) => void
  ): Promise<Mailbox> {
    const mailbox = new Mailbox(position, onClick);
    await mailbox.initializeSprite();
    return mailbox;
  }
}

export default Mailbox;

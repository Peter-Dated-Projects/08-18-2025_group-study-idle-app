import { SignalHandler } from "../engine/scripts/GlobalSignalHandler";
import { CharacterAnimation } from "../engine/graphics/AnimationStateMachine";

/**
 * Signal handler for avatar-related events
 * Manages avatar state changes and animations in response to signals
 */
export class AvatarSignalHandler extends SignalHandler {
  private characterAnimation: CharacterAnimation;

  constructor(characterAnimation: CharacterAnimation) {
    super();
    this.characterAnimation = characterAnimation;
  }

  initialize(): void {
    // Subscribe to avatar-related signals
    this.subscribeToSignal("avatarCharacterClicked", this.handleAvatarClicked.bind(this));
    this.subscribeToSignal("avatar.cheer", this.handleAvatarCheer.bind(this));
    this.subscribeToSignal("avatar.love", this.handleAvatarLove.bind(this));
    this.subscribeToSignal("avatar.setIdle", this.handleSetIdle.bind(this));
  }

  /**
   * Handle avatar character clicked - immediately set to cheer_idle state
   */
  private handleAvatarClicked(): void {
    console.log("Avatar clicked! Setting to cheer_idle state");
    this.characterAnimation.setState("cheer_idle");
  }

  /**
   * Handle avatar cheer signal
   */
  private handleAvatarCheer(): void {
    console.log("Avatar cheer signal received");
    this.characterAnimation.setState("cheer_idle");
  }

  /**
   * Handle avatar love signal
   */
  private handleAvatarLove(): void {
    console.log("Avatar love signal received");
    this.characterAnimation.setState("heart_idle");
  }

  /**
   * Handle set idle signal
   */
  private handleSetIdle(): void {
    console.log("Avatar set to idle");
    this.characterAnimation.setState("idle");
  }

  /**
   * Get the current animation state name
   */
  public getCurrentState(): string | null {
    return this.characterAnimation.getCurrentStateId();
  }

  /**
   * Set a specific animation state
   * @param stateName - The name of the state to set
   */
  public setAnimationState(stateName: string): void {
    this.characterAnimation.setState(stateName);
  }
}

/**
 * Global Signal Handler System
 * Redesigned to use independent handler classes that run their own logic
 * Each handler manages specific objects and responds to signals independently
 */

export type SignalCallback<T = any> = (data?: T) => void;

interface SignalSubscription<T = any> {
  id: string;
  callback: SignalCallback<T>;
}

interface PendingSignal<T = any> {
  name: string;
  data?: T;
  timestamp: number;
}

/**
 * Base class for signal handlers
 * Extend this to create handlers that manage specific objects
 */
export abstract class SignalHandler {
  protected unsubscribeFunctions: (() => void)[] = [];

  /**
   * Called when the handler is initialized
   * Subscribe to signals and set up initial state here
   */
  abstract initialize(): void;

  /**
   * Called when the handler should clean up
   * All signal subscriptions are automatically cleaned up
   */
  destroy(): void {
    this.unsubscribeFunctions.forEach((unsub) => unsub());
    this.unsubscribeFunctions = [];
  }

  /**
   * Helper method to subscribe to signals and track unsubscribe functions
   */
  protected subscribeToSignal<T = any>(signalName: string, callback: SignalCallback<T>): void {
    const unsubscribe = globalSignalHandler.subscribe(signalName, callback);
    this.unsubscribeFunctions.push(unsubscribe);
  }
}

class GlobalSignalHandler {
  private subscribers: Map<string, SignalSubscription[]> = new Map();
  private pendingSignals: PendingSignal[] = [];
  private subscriptionCounter = 0;
  private handlers: SignalHandler[] = [];

  /**
   * Register a signal handler
   * @param handler - The handler instance to register
   */
  public registerHandler(handler: SignalHandler): void {
    this.handlers.push(handler);
    handler.initialize();
  }

  /**
   * Unregister a signal handler
   * @param handler - The handler instance to unregister
   */
  public unregisterHandler(handler: SignalHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index !== -1) {
      this.handlers.splice(index, 1);
      handler.destroy();
    }
  }

  /**
   * Subscribe to a signal
   * @param signalName - The name of the signal to listen for
   * @param callback - Function to call when signal is emitted
   * @returns Unsubscribe function
   */
  public subscribe<T = any>(signalName: string, callback: SignalCallback<T>): () => void {
    const subscriptionId = `sub_${this.subscriptionCounter++}`;

    if (!this.subscribers.has(signalName)) {
      this.subscribers.set(signalName, []);
    }

    const subscription: SignalSubscription<T> = {
      id: subscriptionId,
      callback,
    };

    this.subscribers.get(signalName)!.push(subscription);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(signalName, subscriptionId);
    };
  }

  /**
   * Unsubscribe from a signal
   * @param signalName - The signal to unsubscribe from
   * @param subscriptionId - The subscription ID to remove
   */
  private unsubscribe(signalName: string, subscriptionId: string): void {
    const subs = this.subscribers.get(signalName);
    if (subs) {
      const index = subs.findIndex((sub) => sub.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);

        // Clean up empty signal arrays
        if (subs.length === 0) {
          this.subscribers.delete(signalName);
        }
      }
    }
  }

  /**
   * Emit a signal - adds to pending queue for next update cycle
   * @param signalName - The name of the signal to emit
   * @param data - Optional data to send with the signal
   */
  public emit<T = any>(signalName: string, data?: T): void {
    this.pendingSignals.push({
      name: signalName,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Process all pending signals - call this in your game loop
   * This ensures signals are processed in a controlled manner
   */
  public update(): void {
    // Process all pending signals
    while (this.pendingSignals.length > 0) {
      const signal = this.pendingSignals.shift()!;
      this.processSignal(signal);
    }
  }

  /**
   * Process a single signal by notifying all subscribers
   */
  private processSignal(signal: PendingSignal): void {
    const subscribers = this.subscribers.get(signal.name);
    if (subscribers) {
      subscribers.forEach((sub) => {
        try {
          sub.callback(signal.data);
        } catch (error) {
          console.error(`Error in signal handler for '${signal.name}':`, error);
        }
      });
    }
  }

  /**
   * Get all active signal names (for debugging)
   */
  public getActiveSignals(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Get subscriber count for a signal (for debugging)
   */
  public getSubscriberCount(signalName: string): number {
    return this.subscribers.get(signalName)?.length || 0;
  }

  /**
   * Clear all subscribers, pending signals, and handlers
   */
  public clear(): void {
    // Clean up all handlers
    this.handlers.forEach((handler) => handler.destroy());
    this.handlers = [];

    this.subscribers.clear();
    this.pendingSignals = [];
  }

  /**
   * Get pending signals count (for debugging)
   */
  public getPendingSignalsCount(): number {
    return this.pendingSignals.length;
  }
}

// Create the global singleton instance
const globalSignalHandler = new GlobalSignalHandler();

// Export the instance and convenient helper functions
export default globalSignalHandler;

/**
 * Helper function to register a signal handler
 * @param handler - Handler instance to register
 */
export const registerSignalHandler = (handler: SignalHandler) => {
  globalSignalHandler.registerHandler(handler);
};

/**
 * Helper function to unregister a signal handler
 * @param handler - Handler instance to unregister
 */
export const unregisterSignalHandler = (handler: SignalHandler) => {
  globalSignalHandler.unregisterHandler(handler);
};

/**
 * Helper function to subscribe to signals from any file
 * @param signalName - Signal to listen for
 * @param callback - Function to call when signal is received
 * @returns Unsubscribe function
 */
export const onSignal = <T = any,>(signalName: string, callback: SignalCallback<T>) => {
  return globalSignalHandler.subscribe(signalName, callback);
};

/**
 * Helper function to emit signals from any file
 * @param signalName - Signal to emit
 * @param data - Optional data to send
 */
export const emitSignal = <T = any,>(signalName: string, data?: T) => {
  globalSignalHandler.emit(signalName, data);
};

/**
 * Helper function to update signal processing - call in your main game loop
 */
export const updateSignals = () => {
  globalSignalHandler.update();
};

/**
 * USAGE EXAMPLES:
 *
 * // Creating a custom signal handler:
 * class MyGameHandler extends SignalHandler {
 *   private player: Player;
 *   private ui: UIManager;
 *
 *   constructor(player: Player, ui: UIManager) {
 *     super();
 *     this.player = player;
 *     this.ui = ui;
 *   }
 *
 *   initialize(): void {
 *     this.subscribeToSignal('player.gotItem', this.handleItemGet.bind(this));
 *     this.subscribeToSignal('player.tookDamage', this.handleDamage.bind(this));
 *   }
 *
 *   private handleItemGet(data: {item: Item, value: number}): void {
 *     this.player.addToInventory(data.item);
 *     this.ui.showItemNotification(data.item);
 *   }
 *
 *   private handleDamage(data: {damage: number}): void {
 *     this.player.takeDamage(data.damage);
 *     this.ui.shakeScreen();
 *   }
 * }
 *
 * // Using the handler:
 * const gameHandler = new MyGameHandler(player, ui);
 * registerSignalHandler(gameHandler);
 *
 * // In any file - emit a signal:
 * import { emitSignal } from '@/engine/GlobalSignalHandler';
 *
 * function playerGotItem(item: Item) {
 *   emitSignal('player.gotItem', { item, value: item.value });
 * }
 *
 * // In your main game loop:
 * import { updateSignals } from '@/engine/GlobalSignalHandler';
 *
 * function gameLoop() {
 *   updateSignals(); // Process all pending signals
 *   // ... rest of your game logic
 * }
 *
 * // Clean up when done:
 * unregisterSignalHandler(gameHandler);
 */

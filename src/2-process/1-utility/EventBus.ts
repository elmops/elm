import { logger } from 'src/2-process/1-utility/Logging';

// Event Types with Discriminated Union
export const EventTypes = {
  STORE_ACTION: 'STORE_ACTION',
  STORE_UPDATE: 'STORE_UPDATE',
  CONNECTION_STATE: 'CONNECTION_STATE',
  ERROR: 'ERROR',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export interface EventMeta {
  readonly timestamp: number;
  readonly sender: string;
  readonly target?: string;
}

export interface AppEvent<T = unknown> {
  readonly type: EventType;
  readonly payload: T;
  readonly meta?: EventMeta;
}

// Type guard for runtime type checking
export const isAppEvent = (event: unknown): event is AppEvent => {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    'payload' in event &&
    Object.values(EventTypes).includes((event as AppEvent).type)
  );
};

export interface EventBus {
  readonly emit: <T>(event: AppEvent<T>) => void;
  readonly on: <T>(
    type: EventType,
    handler: (event: AppEvent<T>) => void
  ) => () => void;
  readonly off: <T>(
    type: EventType,
    handler: (event: AppEvent<T>) => void
  ) => void;
}

export interface NetworkTransport {
  readonly send: (data: unknown) => Promise<void>;
  readonly onMessage: (handler: (data: unknown) => void) => void;
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
}

/**
 * Abstract implementation of the EventBus interface.
 * Provides type-safe event emission and subscription handling.
 */
export class AbstractEventBus implements EventBus {
  private readonly handlers: Map<
    EventType,
    Set<(event: AppEvent<any>) => void>
  > = new Map();

  private getOrCreateHandlerSet(
    type: EventType
  ): Set<(event: AppEvent<any>) => void> {
    let handlers = this.handlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(type, handlers);
    }
    return handlers;
  }

  public emit<T>(event: AppEvent<T>): void {
    if (!isAppEvent(event)) {
      logger.error('Invalid event format:', event);
      return;
    }

    const handlers = this.handlers.get(event.type);
    if (!handlers?.size) {
      logger.debug(`No handlers registered for event type: ${event.type}`);
      return;
    }

    handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        logger.error('Error in event handler:', {
          error,
          eventType: event.type,
          handler: handler.name || 'anonymous',
        });
      }
    });
  }

  public on<T>(
    type: EventType,
    handler: (event: AppEvent<T>) => void
  ): () => void {
    const handlers = this.getOrCreateHandlerSet(type);
    const typedHandler = handler as (event: AppEvent<any>) => void;
    handlers.add(typedHandler);

    // Return cleanup function
    return () => this.off(type, handler);
  }

  public off<T>(type: EventType, handler: (event: AppEvent<T>) => void): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler as (event: AppEvent<any>) => void);

      // Cleanup empty handler sets
      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }
}

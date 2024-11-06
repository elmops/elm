import { logger } from 'src/2-process/1-utility/Logging';

export type EventType =
  | 'STORE_ACTION'
  | 'STORE_UPDATE'
  | 'CONNECTION_STATE'
  | 'ERROR';

export interface EventMeta {
  timestamp: number;
  sender: string;
  target?: string;
}

export interface AppEvent<T = unknown> {
  type: EventType;
  payload: T;
  meta?: EventMeta;
}

export interface EventBus {
  emit<T>(event: AppEvent<T>): void;
  on<T>(type: EventType, handler: (event: AppEvent<T>) => void): () => void;
  off<T>(type: EventType, handler: (event: AppEvent<T>) => void): void;
}

export interface NetworkTransport {
  send(data: unknown): Promise<void>;
  onMessage(handler: (data: unknown) => void): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

// event-bus.ts
export class AbstractEventBus implements EventBus {
  private handlers: Map<EventType, Set<(event: AppEvent<unknown>) => void>> =
    new Map();

  emit<T>(event: AppEvent<T>): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event as AppEvent<unknown>);
        } catch (error) {
          logger.error('Error in event handler:', error);
        }
      });
    }
  }

  on<T>(type: EventType, handler: (event: AppEvent<T>) => void): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    let handlers = this.handlers.get(type);
    if (!handlers) {
      logger.error('Handlers not found for type:', type);
      handlers = new Set();
    }
    handlers.add(handler as (event: AppEvent<unknown>) => void);

    return () => this.off(type, handler);
  }

  off<T>(type: EventType, handler: (event: AppEvent<T>) => void): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler as (event: AppEvent<unknown>) => void);
    }
  }
}

import type { AppEvent, EventMeta, BaseEventMap } from './BaseEvents';
import type { StoreEventMap } from './StoreEvents';
import type { SecureEventMap } from './SecureEvents';

// Type-safe event mapping
export interface EventMap extends StoreEventMap, SecureEventMap, BaseEventMap {}

export type { AppEvent, EventMeta };

export class AbstractEventBus {
  private handlers = new Map<
    keyof EventMap,
    Set<(event: AppEvent<any, any>) => void>
  >();

  emit<K extends keyof EventMap>(event: AppEvent<EventMap[K], K>): void {
    const handlers = this.handlers.get(event.type);
    handlers?.forEach((handler) => handler(event));
  }

  on<K extends keyof EventMap>(
    type: K,
    handler: (event: AppEvent<EventMap[K], K>) => void
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)?.add(handler);
    return () => this.off(type, handler);
  }

  off<K extends keyof EventMap>(
    type: K,
    handler: (event: AppEvent<EventMap[K], K>) => void
  ): void {
    this.handlers.get(type)?.delete(handler);
  }
}

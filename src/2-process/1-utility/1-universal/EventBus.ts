import type {
  AppEvent,
  EventMeta,
  BaseEventMap,
} from '@/2-process/1-utility/1-universal/BaseEvents';
import type { StoreEventMap } from '@/2-process/1-utility/1-universal/StoreEvents';
import type { SecureEventMap } from '@/2-process/1-utility/1-universal/SecureEvents';

// Type-safe event mapping
export interface EventMap extends StoreEventMap, SecureEventMap, BaseEventMap {}

export type { AppEvent, EventMeta };

export class AbstractEventBus {
  private handlers = new Map<
    keyof EventMap,
    Set<(event: AppEvent<any, any>) => void>
  >();

  emit<K extends keyof EventMap>(event: AppEvent<EventMap[K], K>): void {
    // Log the event
    console.log(
      `🔥[Event] ${event.type}${event.meta?.sender ? ` from ${event.meta.sender}` : ''}${
        event.meta?.target ? ` to ${event.meta.target}` : ''
      }`,
      event.payload
    );

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

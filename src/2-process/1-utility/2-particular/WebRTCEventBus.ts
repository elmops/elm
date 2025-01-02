import {
  AbstractEventBus,
  type AppEvent,
  type EventMap,
} from '@/2-process/1-utility/1-universal/EventBus';
import type {
  StoreAction,
  StoreUpdate,
} from '@/2-process/1-utility/1-universal/NetworkedStore';
import type { SignedMessage } from '@/2-process/1-utility/1-universal/SecureIdentity';
import type { ErrorPayload } from '@/2-process/1-utility/1-universal/BaseEvents';

import { logger } from '@/2-process/1-utility/1-universal/Logging';
import type { WebRTCTransport } from '@/2-process/1-utility/2-particular/WebRTCTransport';

type ValidEventPayload =
  | StoreAction<unknown>
  | StoreUpdate
  | SignedMessage<StoreAction<unknown>>
  | SignedMessage<StoreUpdate>
  | ErrorPayload;

export class WebRTCEventBus extends AbstractEventBus {
  public readonly transport: WebRTCTransport;

  constructor(transport: WebRTCTransport) {
    super();
    this.transport = transport;

    this.transport.onMessage((data) => {
      if (this.isValidEvent(data)) {
        const event = data as AppEvent<ValidEventPayload, keyof EventMap>;
        super.emit(event);
      } else {
        logger.error('Invalid event received:', data);
      }
    });
  }

  private isValidEvent(
    data: unknown
  ): data is AppEvent<ValidEventPayload, keyof EventMap> {
    if (typeof data !== 'object' || data === null) return false;
    const event = data as Partial<AppEvent<ValidEventPayload, keyof EventMap>>;
    return (
      typeof event.type === 'string' &&
      'payload' in event &&
      (!event.meta || typeof event.meta === 'object')
    );
  }

  override emit<K extends keyof EventMap>(
    event: AppEvent<EventMap[K], K>
  ): void {
    super.emit(event);
    this.transport.send(event).catch((error) => {
      logger.error('Error sending event:', error);
    });
  }
}

import {
  AbstractEventBus,
  type AppEvent,
} from '@/2-process/1-utility/1-universal/EventBus';

import { logger } from '@/2-process/1-utility/1-universal/Logging';

import type { WebRTCTransport } from '@/2-process/1-utility/2-particular/WebRTCTransport';

export class WebRTCEventBus extends AbstractEventBus {
  public readonly transport: WebRTCTransport;

  constructor(transport: WebRTCTransport) {
    super();
    this.transport = transport;

    this.transport.onMessage((data) => {
      if (this.isValidEvent(data)) {
        super.emit(data);
      } else {
        logger.error('Invalid event received:', data);
      }
    });
  }

  private isValidEvent(data: unknown): data is AppEvent {
    if (typeof data !== 'object' || data === null) return false;
    const event = data as Partial<AppEvent>;
    return (
      typeof event.type === 'string' &&
      'payload' in event &&
      (!event.meta || typeof event.meta === 'object')
    );
  }

  override emit<T>(event: AppEvent<T>): void {
    super.emit(event);
    this.transport.send(event).catch((error) => {
      logger.error('Error sending event:', error);
    });
  }
}

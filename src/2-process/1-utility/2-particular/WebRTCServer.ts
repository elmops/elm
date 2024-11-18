import {
  createNetworkedStore,
  type NetworkedStore,
  type NetworkedStoreOptions,
} from '@/2-process/1-utility/1-universal/NetworkedStore';

import { WebRTCTransport } from '@/2-process/1-utility/2-particular/WebRTCTransport';
import { WebRTCEventBus } from '@/2-process/1-utility/2-particular/WebRTCEventBus';

export class WebRTCServer {
  private eventBus: WebRTCEventBus;
  private store: NetworkedStore<any>;
  private connectionId: string;

  constructor(
    connectionId: string,
    storeOptions: NetworkedStoreOptions<any>,
    peerConfig?: {
      host?: string;
      port?: number;
      path?: string;
      secure?: boolean;
    }
  ) {
    this.connectionId = connectionId;

    const transport = new WebRTCTransport({
      connectionId,
      config: peerConfig,
    });

    this.eventBus = new WebRTCEventBus(transport);
    this.store = createNetworkedStore(storeOptions, this.eventBus, true);
  }

  async start(): Promise<void> {
    await this.eventBus.transport.connect();
  }

  async stop(): Promise<void> {
    await this.eventBus.transport.disconnect();
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  getStore(): NetworkedStore<any> {
    return this.store;
  }
}

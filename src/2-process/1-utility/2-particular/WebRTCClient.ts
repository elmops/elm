import {
  type NetworkedStore,
  type NetworkedStoreOptions,
  createNetworkedStore,
} from '@/2-process/1-utility/1-universal/NetworkedStore';

import { WebRTCTransport } from '@/2-process/1-utility/2-particular/WebRTCTransport';
import { WebRTCEventBus } from '@/2-process/1-utility/2-particular/WebRTCEventBus';

export class WebRTCClient {
  private eventBus: WebRTCEventBus;
  private store: NetworkedStore<any>;

  constructor(
    serverConnectionId: string,
    storeOptions: NetworkedStoreOptions<any>,
    peerConfig?: {
      host?: string;
      port?: number;
      path?: string;
      secure?: boolean;
    }
  ) {
    const transport = new WebRTCTransport({
      serverConnectionId,
      config: peerConfig,
    });

    this.eventBus = new WebRTCEventBus(transport);
    this.store = createNetworkedStore(storeOptions, this.eventBus, false);
  }

  async connect(): Promise<void> {
    await this.eventBus.transport.connect();
  }

  async disconnect(): Promise<void> {
    await this.eventBus.transport.disconnect();
  }

  getStore(): NetworkedStore<any> {
    return this.store;
  }
}

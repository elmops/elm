import { v4 as uuidv4 } from 'uuid';

import {
  type NetworkedStore,
  type StoreAction,
  createNetworkedStore,
} from '@/2-process/1-utility/1-universal/NetworkedStore';
import {
  secureIdentityManager,
  type SignedMessage,
} from '@/2-process/1-utility/1-universal/SecureIdentity';
import type { EventMap } from '@/2-process/1-utility/1-universal/EventBus';
import { exportKeyPair } from '@/2-process/1-utility/1-universal/Crypto';

import { WebRTCTransport } from '@/2-process/1-utility/2-particular/WebRTCTransport';
import { WebRTCEventBus } from '@/2-process/1-utility/2-particular/WebRTCEventBus';

export class WebRTCClient {
  private eventBus: WebRTCEventBus;
  private store: NetworkedStore<any>;
  private serverPublicKey: JsonWebKey | null = null;

  constructor(
    serverConnectionId: string,
    peerConfig?: {
      host?: string;
      port?: number;
      path?: string;
      secure?: boolean;
    }
  ) {
    const transport = new WebRTCTransport({
      serverConnectionId,
      connectionId: uuidv4(),
      config: peerConfig,
    });

    this.eventBus = new WebRTCEventBus(transport);

    this.store = createNetworkedStore(
      {
        id: 'client-store',
        state: () => ({}),
      },
      this.eventBus,
      false
    );

    this.setupSecureMessageHandling();
  }

  private async setupSecureMessageHandling() {
    // Handle server key exchange
    this.eventBus.on('SERVER_KEY_EXCHANGE', async (event) => {
      this.serverPublicKey = event.payload.publicKey;

      // Send client's public key
      const identity = secureIdentityManager.getIdentity();
      if (!identity) throw new Error('Client identity not initialized');

      const { publicKey } = await exportKeyPair(identity.keyPair);

      this.sendSecureMessage('CLIENT_KEY_EXCHANGE', {
        publicKey,
      });
    });

    // Handle store updates from server
    this.eventBus.on('STORE_UPDATE', (event) => {
      // Apply update directly since WebRTC handles security
      Object.assign(this.store.state, event.payload.state);
    });
  }

  async dispatch(action: StoreAction): Promise<void> {
    const signedAction = await secureIdentityManager.signMessage(action);

    this.eventBus.emit({
      type: 'SECURE_STORE_ACTION',
      payload: signedAction,
      meta: {
        timestamp: Date.now(),
        sender: secureIdentityManager.getIdentity()?.id || 'unknown',
      },
    });
  }

  private async sendSecureMessage<K extends keyof EventMap>(
    type: K,
    payload: EventMap[K] extends SignedMessage<infer P> ? P : EventMap[K]
  ): Promise<void> {
    const needsSigning = type !== 'SERVER_KEY_EXCHANGE';
    const finalPayload = needsSigning
      ? await secureIdentityManager.signMessage(payload)
      : payload;

    this.eventBus.emit({
      type,
      payload: finalPayload as EventMap[K],
      meta: {
        timestamp: Date.now(),
        sender: secureIdentityManager.getIdentity()?.id || 'unknown',
      },
    });
  }

  async connect(): Promise<void> {
    const identity = secureIdentityManager.getIdentity();
    if (!identity) throw new Error('Client identity not initialized');

    await this.eventBus.transport.connect();

    // Wait for key exchange
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Key exchange timeout'));
      }, 10000);

      const unsubscribe = this.eventBus.on('SERVER_KEY_EXCHANGE', () => {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      });
    });

    // Request initial state
    await this.sendSecureMessage('REQUEST_INITIAL_STATE', {
      clientId: identity.id,
    });
  }

  async disconnect(): Promise<void> {
    await this.eventBus.transport.disconnect();
  }

  getStore(): NetworkedStore<any> {
    return this.store;
  }
}

import { v4 as uuidv4 } from 'uuid';

import type {
  NetworkedStore,
  StoreAction,
} from '@/2-process/1-utility/1-universal/NetworkedStore';
import { createNetworkedStore } from '@/2-process/1-utility/1-universal/NetworkedStore';
import { secureIdentityManager } from '@/2-process/1-utility/1-universal/SecureIdentity';
import type { SecureEventMap } from '@/2-process/1-utility/1-universal/SecureEvents';
import type { AppEvent } from '@/2-process/1-utility/1-universal/BaseEvents';
import { exportKeyPair } from '@/2-process/1-utility/1-universal/Crypto';

import type { ConnectionState } from '@/1-data/type/NetworkTransport';

import { WebRTCTransport } from '@/2-process/1-utility/2-particular/WebRTCTransport';
import { WebRTCEventBus } from '@/2-process/1-utility/2-particular/WebRTCEventBus';

export class WebRTCClient {
  private readonly transport: WebRTCTransport;
  private readonly eventBus: WebRTCEventBus;
  private readonly store: NetworkedStore<any>;

  constructor(
    serverConnectionId: string,
    peerConfig?: {
      host?: string;
      port?: number;
      path?: string;
    }
  ) {
    console.info(
      '📱[WebRTCClient] Initializing with server ID:',
      serverConnectionId
    );

    // Initialize transport with client configuration
    this.transport = new WebRTCTransport({
      serverConnectionId,
      connectionId: uuidv4(), // Generate unique client ID
      config: peerConfig,
    });

    // Initialize event bus with transport
    this.eventBus = new WebRTCEventBus(this.transport);
    console.info('📱[WebRTCClient] Created event bus');

    // Initialize networked store
    this.store = createNetworkedStore(
      {
        id: 'client-store',
        state: () => ({}),
      },
      this.eventBus,
      false
    );
    console.info('📱[WebRTCClient] Created networked store');

    // Handle store updates from server
    this.eventBus.on('STORE_UPDATE', (event) => {
      Object.assign(this.store.state, event.payload.state);
    });
  }

  async connect(): Promise<void> {
    console.info('📱[WebRTCClient] Starting connection process');
    try {
      // Verify identity is initialized
      const identity = secureIdentityManager.getIdentity();
      if (!identity) {
        throw new Error('Client identity not initialized');
      }
      console.info('📱[WebRTCClient] Identity verified');

      // Connect transport
      await this.transport.connect();
      console.info('📱[WebRTCClient] Transport connected');

      // Export public key for server authentication
      const { publicKey } = await exportKeyPair(identity.keyPair);
      console.info('📱[WebRTCClient] Exported public key');

      // Send key exchange event
      await this.emitSecureEvent('CLIENT_KEY_EXCHANGE', {
        publicKey,
      });
      console.info('📱[WebRTCClient] Sent key exchange');

      // Request initial state
      await this.emitSecureEvent('REQUEST_INITIAL_STATE', {
        clientId: identity.id,
      });
      console.info('📱[WebRTCClient] Requested initial state');
    } catch (error) {
      console.error('📱[WebRTCClient] Failed to connect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.transport.disconnect();
  }

  async dispatch(action: StoreAction): Promise<void> {
    await this.emitSecureEvent('SECURE_STORE_ACTION', action);
  }

  getStore(): NetworkedStore<any> {
    return this.store;
  }

  getConnectionState(): ConnectionState {
    return this.transport.getConnectionState();
  }

  private async emitSecureEvent<T>(
    type: keyof SecureEventMap,
    payload: T
  ): Promise<void> {
    console.info('📱[WebRTCClient] Emitting secure event:', type);
    const signedPayload = await secureIdentityManager.signMessage(payload);
    this.eventBus.emit({
      type,
      payload: signedPayload,
      meta: {
        timestamp: Date.now(),
        sender: secureIdentityManager.getIdentity()?.id || 'unknown',
      },
    } as AppEvent<SecureEventMap[typeof type], typeof type>);
  }
}

import { v4 as uuidv4 } from 'uuid';
import {
  type NetworkedStore,
  type StoreAction,
  createSecureNetworkedStore,
} from '@/2-process/1-utility/1-universal/NetworkedStore';
import {
  secureIdentityManager,
  type SignedMessage,
} from '@/2-process/1-utility/1-universal/SecureIdentity';
import { WebRTCTransport } from '@/2-process/1-utility/2-particular/WebRTCTransport';
import { WebRTCEventBus } from '@/2-process/1-utility/2-particular/WebRTCEventBus';
import { logger } from '@/2-process/1-utility/1-universal/Logging';
import { verifySignature } from '../1-universal/Crypto';
import type { EventMap } from '../1-universal/EventBus';

export class WebRTCClient {
  private eventBus: WebRTCEventBus;
  private store: NetworkedStore<any>;
  private serverPublicKey: CryptoKey | null = null;
  private lastServerNonce = 0;

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

    this.store = createSecureNetworkedStore(
      {
        id: 'client-store',
        state: () => ({}),
      },
      this.eventBus,
      false
    );

    this.setupSecureMessageHandling();
  }

  private setupSecureMessageHandling() {
    // Handle server key exchange
    this.eventBus.on('SERVER_KEY_EXCHANGE', (event) => {
      this.serverPublicKey = event.payload.publicKey;

      // Send client's public key
      const identity = secureIdentityManager.getIdentity();
      if (!identity) throw new Error('Client identity not initialized');

      this.sendSecureMessage('CLIENT_KEY_EXCHANGE', {
        publicKey: identity.keyPair.publicKey,
      });
    });

    // Handle store updates from server
    this.eventBus.on('SECURE_STORE_UPDATE', async (event) => {
      const signedUpdate = event.payload;
      if (!(await this.verifyServerMessage(signedUpdate))) {
        logger.warn('Received invalid store update from server');
        return;
      }

      // Apply verified update
      Object.assign(this.store.state, signedUpdate.payload.state);
    });
  }

  private async verifyServerMessage<T>(
    message: SignedMessage<T>
  ): Promise<boolean> {
    if (!this.serverPublicKey) {
      logger.warn('No server public key available');
      return false;
    }

    try {
      // Verify signature
      const isValid = await verifySignature(
        {
          payload: message.payload,
          timestamp: message.timestamp,
          nonce: message.nonce,
          senderId: message.senderId,
        },
        message.signature,
        this.serverPublicKey
      );

      if (!isValid) {
        logger.warn('Invalid server signature');
        return false;
      }

      // Verify nonce is increasing
      if (message.nonce <= this.lastServerNonce) {
        logger.warn('Invalid server nonce');
        return false;
      }
      this.lastServerNonce = message.nonce;

      // Verify timestamp
      const MAX_MESSAGE_AGE = 30000; // 30 seconds
      if (Date.now() - message.timestamp > MAX_MESSAGE_AGE) {
        logger.warn('Server message too old');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying server message:', error);
      return false;
    }
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

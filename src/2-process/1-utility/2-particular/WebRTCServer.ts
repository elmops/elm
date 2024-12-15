import {
  createSecureNetworkedStore,
  type NetworkedStore,
  type NetworkedStoreOptions,
} from '@/2-process/1-utility/1-universal/NetworkedStore';
import type { SignedMessage } from '@/2-process/1-utility/1-universal/SecureIdentity';
import type { SecureStoreAction } from '@/2-process/1-utility/1-universal/NetworkedStore';

import { secureIdentityManager } from '@/2-process/1-utility/1-universal/SecureIdentity';
import { WebRTCTransport } from './WebRTCTransport';
import { WebRTCEventBus } from './WebRTCEventBus';
import { logger } from '@/2-process/1-utility/1-universal/Logging';
import { verifySignature } from '@/2-process/1-utility/1-universal/Crypto';
import { permissionManager } from '@/2-process/1-utility/1-universal/Permissions';
import type { Capability } from '@/1-data/type/Domain';
import { v4 as uuidv4 } from 'uuid';

export interface PublicIdentity {
  id: string;
  publicKey: CryptoKey;
}

export class WebRTCServer {
  private eventBus: WebRTCEventBus;
  private store: NetworkedStore<any>;
  private authorizedClients: Map<string, PublicIdentity> = new Map();
  private clientNonces: Map<string, number> = new Map();
  private readonly connectionId: string;

  constructor(
    hostIdentity: PublicIdentity,
    storeOptions: NetworkedStoreOptions<any>,
    peerConfig?: {
      host?: string;
      port?: number;
      path?: string;
      secure?: boolean;
    }
  ) {
    // Generate a unique connection ID for this server
    this.connectionId = uuidv4();

    const transport = new WebRTCTransport({
      connectionId: this.connectionId,
      config: peerConfig,
    });

    this.eventBus = new WebRTCEventBus(transport);
    this.store = createSecureNetworkedStore(storeOptions, this.eventBus, true);

    // Authorize the host immediately
    this.authorizedClients.set(hostIdentity.id, hostIdentity);

    this.setupSecureMessageHandling();
  }

  // Add getter for connection ID
  getConnectionId(): string {
    return this.connectionId;
  }

  private async verifyClientMessage<T>(
    message: SignedMessage<T>
  ): Promise<boolean> {
    const clientIdentity = this.authorizedClients.get(message.senderId);
    if (!clientIdentity) {
      logger.warn(
        'Message received from unauthorized client:',
        message.senderId
      );
      return false;
    }

    // Verify the signature
    try {
      const isValid = await verifySignature(
        {
          payload: message.payload,
          timestamp: message.timestamp,
          nonce: message.nonce,
          senderId: message.senderId,
        },
        message.signature,
        clientIdentity.publicKey
      );

      if (!isValid) {
        logger.warn('Invalid signature from client:', message.senderId);
        return false;
      }

      // Verify nonce is increasing
      const lastNonce = this.clientNonces.get(message.senderId) || 0;
      if (message.nonce <= lastNonce) {
        logger.warn('Invalid nonce from client:', message.senderId);
        return false;
      }
      this.clientNonces.set(message.senderId, message.nonce);

      // Verify timestamp is recent
      const MAX_MESSAGE_AGE = 30000; // 30 seconds
      if (Date.now() - message.timestamp > MAX_MESSAGE_AGE) {
        logger.warn('Message too old from client:', message.senderId);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying client message:', error);
      return false;
    }
  }

  private async verifyAndAuthorizeAction(
    signedAction: SignedMessage<SecureStoreAction>
  ): Promise<boolean> {
    // First verify the signature
    if (!(await this.verifyClientMessage(signedAction))) {
      return false;
    }

    const { senderId, payload: action } = signedAction;

    // Check permissions if action requires them
    if (action.requiredCapability) {
      if (
        !permissionManager.isAuthorized(
          senderId,
          action.requiredCapability as Capability
        )
      ) {
        logger.warn(
          `Client ${senderId} lacks capability for action: ${action.type}`
        );
        this.eventBus.emit({
          type: 'ERROR',
          payload: {
            code: 'PERMISSION_DENIED',
            message: `Required capability not granted for action: ${action.type}`,
          },
          meta: {
            timestamp: Date.now(),
            sender: 'server',
            target: senderId,
          },
        });
        return false;
      }
    }

    return true;
  }

  private setupSecureMessageHandling() {
    this.eventBus.on('SECURE_STORE_ACTION', async (event) => {
      const signedAction = event.payload;

      if (!(await this.verifyAndAuthorizeAction(signedAction))) {
        return;
      }

      // Process authorized action
      const action = signedAction.payload;
      await this.store.dispatch(action);
    });
  }

  async start(): Promise<void> {
    const identity = secureIdentityManager.getIdentity();
    if (!identity) {
      throw new Error('Server identity not initialized');
    }

    await this.eventBus.transport.connect();
  }

  async stop(): Promise<void> {
    await this.eventBus.transport.disconnect();
    this.authorizedClients.clear();
  }

  getStore(): NetworkedStore<any> {
    return this.store;
  }
}

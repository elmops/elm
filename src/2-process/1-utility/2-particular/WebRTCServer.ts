import {
  createNetworkedStore,
  type NetworkedStore,
  type NetworkedStoreOptions,
} from '@/2-process/1-utility/1-universal/NetworkedStore';
import type {
  SignedMessage,
  PublicIdentity,
} from '@/2-process/1-utility/1-universal/SecureIdentity';
import type { SecureStoreAction } from '@/2-process/1-utility/1-universal/NetworkedStore';

import { WebRTCTransport } from './WebRTCTransport';
import { WebRTCEventBus } from './WebRTCEventBus';

import {
  importKey,
  verifySignature,
  comparePublicKeys,
} from '@/2-process/1-utility/1-universal/Crypto';
import { PermissionManager } from '@/2-process/1-utility/1-universal/Permissions';
import type { Capability } from '@/1-data/type/Domain';
import { v4 as uuidv4 } from 'uuid';

interface ClientData extends PublicIdentity {
  lastNonce: number;
}

export class WebRTCServer {
  private eventBus: WebRTCEventBus;
  private store: NetworkedStore<any>;
  private clientRegistry: Map<string, ClientData> = new Map();
  private readonly connectionId: string;
  private readonly hostIdentity: PublicIdentity;
  private readonly permissionManager: PermissionManager;

  constructor(
    hostIdentity: PublicIdentity,
    storeOptions: NetworkedStoreOptions<any>,
    peerConfig?: {
      host?: string;
      port?: number;
      path?: string;
    }
  ) {
    this.hostIdentity = hostIdentity;
    this.connectionId = uuidv4();
    console.info('☁️[WebRTCServer] Server connection ID:', this.connectionId);

    const transport = new WebRTCTransport({
      connectionId: this.connectionId,
      config: peerConfig,
    });

    this.eventBus = new WebRTCEventBus(transport);
    this.store = createNetworkedStore(storeOptions, this.eventBus, true);

    // Register the host immediately
    this.clientRegistry.set(hostIdentity.id, {
      ...hostIdentity,
      lastNonce: 0,
    });
    console.info(
      `☁️[WebRTCServer] Host authorized, connection ID: ${this.connectionId}`
    );

    this.permissionManager = new PermissionManager(hostIdentity.id);

    this.setupEventBusEvents();
  }

  // Add getter for connection ID
  getConnectionId(): string {
    return this.connectionId;
  }

  private async validateClientMessage<T>(
    message: SignedMessage<T>
  ): Promise<boolean> {
    const clientData = this.clientRegistry.get(message.senderId);
    if (!clientData) {
      console.warn('☁️[WebRTCServer] Unknown client:', message.senderId);
      return false;
    }

    // Verify the signature
    try {
      const publicKey = await importKey(clientData.publicKey);

      const isValid = await verifySignature(
        {
          payload: message.payload,
          timestamp: message.timestamp,
          nonce: message.nonce,
          senderId: message.senderId,
        },
        message.signature,
        publicKey
      );

      if (!isValid) {
        console.warn(
          `☁️[WebRTCServer] Invalid signature from client: ${message.senderId}: ${message.nonce} <= ${clientData.lastNonce}`
        );
        return false;
      }
      console.log(
        '☁️[WebRTCServer] Valid signature from client:',
        message.senderId
      );

      // Verify nonce is increasing
      if (message.nonce <= clientData.lastNonce) {
        console.warn(
          '☁️[WebRTCServer] Invalid nonce from client:',
          message.senderId
        );
        return false;
      }
      this.clientRegistry.set(message.senderId, {
        ...clientData,
        lastNonce: message.nonce,
      });

      // Verify timestamp is recent
      const MAX_MESSAGE_AGE = 30000; // 30 seconds
      if (Date.now() - message.timestamp > MAX_MESSAGE_AGE) {
        console.warn(
          '☁️[WebRTCServer] Message too old from client:',
          message.senderId
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('☁️[WebRTCServer] Error verifying client message:', error);
      return false;
    }
  }

  private async verifyAndAuthorizeAction(
    signedAction: SignedMessage<SecureStoreAction>
  ): Promise<boolean> {
    // First validate the signature
    if (!(await this.validateClientMessage(signedAction))) {
      return false;
    }

    const { senderId, payload: action } = signedAction;

    // Check permissions if action requires them
    if (action.requiredCapability) {
      if (
        !this.permissionManager.isAuthorized(
          senderId,
          action.requiredCapability as Capability
        )
      ) {
        console.warn(
          `☁️[WebRTCServer] Client ${senderId} lacks capability for action: ${action.type}`
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

  private setupEventBusEvents() {
    // Handle client key exchange
    this.eventBus.on('CLIENT_KEY_EXCHANGE', async (event) => {
      const signedKeyExchange = event.payload;
      const clientId = signedKeyExchange.senderId;
      const clientPublicKey = signedKeyExchange.payload.publicKey;

      // Verify the key exchange message
      if (!(await this.validateClientMessage(signedKeyExchange))) {
        console.error('☁️[WebRTCServer] Invalid client key exchange:', clientId);
        return;
      }
      console.log('☁️[WebRTCServer] Valid client key exchange:', clientId);

      // Add to client registry
      this.clientRegistry.set(clientId, {
        id: clientId,
        publicKey: clientPublicKey,
        lastNonce: signedKeyExchange.nonce,
      });

      // Check if this is the host by comparing public keys
      const isHost = comparePublicKeys(
        clientPublicKey,
        this.hostIdentity.publicKey
      );

      // Get domains
      const systemDomain = this.permissionManager.getDomain('system');
      const meetingDomain = this.permissionManager.getDomain('meeting');
      if (!systemDomain || !meetingDomain) {
        console.error('☁️[WebRTCServer] Required domains not found');
        return;
      }

      try {
        if (isHost) {
          console.log(
            '☁️[WebRTCServer] Data:',
            this.permissionManager.domains,
            this.permissionManager.roles
          );
          // Host gets meeting-executor roles
          await this.permissionManager.assignRoleToUser(
            this.hostIdentity.id,
            meetingDomain,
            clientId,
            'meeting-executor'
          );
        }
        // All clients get meeting-participant role
        await this.permissionManager.assignRoleToUser(
          this.hostIdentity.id,
          meetingDomain,
          clientId,
          'meeting-participant'
        );

        // Send success notification
        this.eventBus.emit<'ERROR'>({
          type: 'ERROR',
          payload: {
            code: 'ROLES_ASSIGNED',
            message: 'Roles assigned successfully',
          },
          meta: {
            timestamp: Date.now(),
            sender: 'server',
            target: clientId,
          },
        });
      } catch (error) {
        console.error(
          '☁️[WebRTCServer] Failed to assign roles to client:',
          error
        );
        this.eventBus.emit<'ERROR'>({
          type: 'ERROR',
          payload: {
            code: 'ROLE_ASSIGNMENT_FAILED',
            message: 'Failed to assign roles',
          },
          meta: {
            timestamp: Date.now(),
            sender: 'server',
            target: clientId,
          },
        });
      }
    });

    // Handle secure store actions
    this.eventBus.on('SECURE_STORE_ACTION', async (event) => {
      const signedAction = event.payload;

      if (!(await this.verifyAndAuthorizeAction(signedAction))) {
        return;
      }

      console.log(
        '☁️[WebRTCServer] Secure store action authorized:',
        signedAction
      );

      // Process authorized action
      const action = signedAction.payload;
      await this.store.dispatch(action);
    });
  }
}

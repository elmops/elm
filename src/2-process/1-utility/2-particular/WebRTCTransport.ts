// NOTE THIS IMPLEMENTATION IS PROBABLY VERY BROKEN

import Peer, { type DataConnection, type PeerJSOption } from 'peerjs';

import { logger } from '../1-universal/Logging';
import {
  type NetworkTransport,
  ConnectionState,
} from '../../../1-data/type/NetworkTransport';
import {
  secureIdentityManager,
  type SecureIdentity,
} from '../1-universal/SecureIdentity';

type WebRTCConfig = {
  host?: string;
  port?: number;
  path?: string;
  secure?: boolean;
};

type ServerOptions = {
  connectionId: string;
  config?: WebRTCConfig;
};

type ClientOptions = {
  serverConnectionId: string;
  connectionId?: string;
  config?: WebRTCConfig;
};

type WebRTCTransportOptions = ServerOptions | ClientOptions;

class WebRTCConnectionError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'WebRTCConnectionError';
  }
}

type MessageHandler = (data: unknown) => void;

const CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 10000,
  RETRY_BASE_DELAY_MS: 1000,
  MAX_RETRIES: 3,
  DEFAULT_ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
} as const;

interface KeyExchangeMessage {
  type: 'KEY_EXCHANGE';
  publicKey: CryptoKey;
}

function isKeyExchangeMessage(data: unknown): data is KeyExchangeMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'KEY_EXCHANGE' &&
    'publicKey' in data &&
    typeof data.publicKey === 'object'
  );
}

interface SecureConnection {
  connection: DataConnection;
  publicKey: CryptoKey;
  verified: boolean;
}

export class WebRTCTransport implements NetworkTransport {
  private readonly peer: Peer;
  private readonly connections: Map<string, SecureConnection> = new Map();
  private messageHandler: MessageHandler | null = null;
  private connectPromise: Promise<void> | null = null;
  private readonly isServer: boolean;
  private readonly serverConnectionId?: string;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private readonly connectionTimeout: number;

  constructor(
    options: WebRTCTransportOptions,
    config: { connectionTimeout?: number } = {}
  ) {
    this.isServer = !this.isClientOptions(options);
    if (this.isClientOptions(options) && !options.serverConnectionId) {
      throw new WebRTCConnectionError(
        'Server connection ID is required for client mode'
      );
    }
    this.serverConnectionId = this.isClientOptions(options)
      ? options.serverConnectionId
      : undefined;
    this.connectionTimeout =
      config.connectionTimeout ?? CONSTANTS.DEFAULT_TIMEOUT_MS;

    this.peer = new Peer(
      options.connectionId ?? '',
      this.createPeerConfig(options.config)
    );
    this.setupPeerHandlers();
  }

  public getState(): ConnectionState {
    return this.connectionState;
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  private createPeerConfig(config?: WebRTCConfig): PeerJSOption {
    return {
      host: config?.host || '0.peerjs.com',
      port: config?.port || 443,
      path: config?.path || '/',
      secure: config?.secure ?? true,
      config: {
        iceServers: [...CONSTANTS.DEFAULT_ICE_SERVERS],
      },
      debug: process.env.NODE_ENV === 'development' ? 3 : 0,
    };
  }

  private setupPeerHandlers() {
    this.peer.on('open', (id) => {
      logger.log(`Peer ${id} connected to signaling server`);
    });

    this.peer.on('connection', (conn) => {
      this.setupConnection(conn);
    });

    this.peer.on('error', (error) => {
      logger.error('Peer error:', error);
      if (error.type === 'disconnected') {
        this.reconnect();
      }
    });
  }

  private async setupSecureConnection(conn: DataConnection): Promise<void> {
    const secureConn: SecureConnection = {
      connection: conn,
      publicKey: null as any,
      verified: false,
    };

    this.connections.set(conn.peer, secureConn);

    // Handle key exchange
    if (this.isServer) {
      await this.handleServerKeyExchange(secureConn);
    } else {
      await this.handleClientKeyExchange(secureConn);
    }

    conn.on('data', async (data) => {
      if (!secureConn.verified) {
        logger.error('Received message from unverified connection:', conn.peer);
        return;
      }
      this.messageHandler?.(data);
    });
  }

  private setupConnection(conn: DataConnection) {
    this.setupSecureConnection(conn).catch((error) => {
      logger.error('Failed to setup secure connection:', error);
      this.connections.delete(conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (this.isServer) {
        this.connectToPeer(conn.peer);
      }
    });

    conn.on('error', (error) => {
      logger.error('Connection error:', error);
      this.connections.delete(conn.peer);
    });
  }

  private async connectToPeer(peerId: string): Promise<void> {
    if (this.connections.has(peerId)) {
      logger.error(`Already connected to peer: ${peerId}`);
      return;
    }

    const conn = this.peer.connect(peerId, {
      reliable: true,
      serialization: 'json',
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new WebRTCConnectionError(`Connection to peer ${peerId} timed out`)
        );
      }, this.connectionTimeout);

      conn.on('open', () => {
        clearTimeout(timeout);
        this.setupConnection(conn);
        resolve();
      });

      conn.on('error', (error) => {
        clearTimeout(timeout);
        reject(
          new WebRTCConnectionError(
            `Failed to connect to peer ${peerId}: ${error}`
          )
        );
      });
    });
  }

  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) return;

    if (this.connectPromise) return this.connectPromise;

    this.connectionState = ConnectionState.CONNECTING;

    this.connectPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connectionState = ConnectionState.DISCONNECTED;
        reject(new WebRTCConnectionError('Connection timeout'));
      }, this.connectionTimeout);

      this.peer.on('open', async () => {
        clearTimeout(timeout);
        try {
          if (!this.isServer && this.serverConnectionId) {
            await this.connectToPeer(this.serverConnectionId);
          }
          this.connectionState = ConnectionState.CONNECTED;
          resolve();
        } catch (error) {
          this.connectionState = ConnectionState.DISCONNECTED;
          reject(new WebRTCConnectionError('Failed to connect to peer'));
        }
      });

      this.peer.on('error', (error) => {
        clearTimeout(timeout);
        this.connectionState = ConnectionState.DISCONNECTED;
        reject(new WebRTCConnectionError(error.message, error.type));
      });
    });

    return this.connectPromise;
  }

  private async reconnect() {
    this.connectPromise = null;
    await this.connect();
  }

  async disconnect(): Promise<void> {
    this.connectionState = ConnectionState.DISCONNECTED;
    this.connectPromise = null;
    this.messageHandler = null;
    this.connections.forEach((conn) => conn.connection.close());
    this.connections.clear();
    this.peer.destroy();
  }

  async send(data: unknown): Promise<void> {
    const identity = secureIdentityManager.getIdentity();
    if (!identity) throw new Error('Identity not initialized');

    // TODO: Sign message with identity private key
    const secureMessage = {
      payload: data,
      senderId: identity.id,
      timestamp: Date.now(),
      signature: 'placeholder',
    };

    if (this.isServer) {
      this.connections.forEach((conn) => {
        if (conn.verified) {
          conn.connection.send(secureMessage);
        }
      });
    } else if (this.serverConnectionId) {
      const serverConn = this.connections.get(this.serverConnectionId);
      if (!serverConn?.verified) {
        throw new Error('No verified connection to server');
      }
      serverConn.connection.send(secureMessage);
    }
  }

  onMessage(handler: (data: unknown) => void): void {
    this.messageHandler = handler;
  }

  private isClientOptions(
    options: WebRTCTransportOptions
  ): options is ClientOptions {
    return 'serverConnectionId' in options;
  }

  private async handleServerKeyExchange(
    secureConn: SecureConnection
  ): Promise<void> {
    const identity = secureIdentityManager.getIdentity();
    if (!identity) throw new Error('Server identity not initialized');

    // Send server public key
    const message: KeyExchangeMessage = {
      type: 'KEY_EXCHANGE',
      publicKey: identity.keyPair.publicKey,
    };
    secureConn.connection.send(message);

    // Wait for client public key
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Key exchange timeout'));
      }, this.connectionTimeout);

      secureConn.connection.on('data', (data: unknown) => {
        if (isKeyExchangeMessage(data)) {
          clearTimeout(timeout);
          secureConn.publicKey = data.publicKey;
          secureConn.verified = true;
          resolve();
        }
      });
    });
  }

  private async handleClientKeyExchange(
    secureConn: SecureConnection
  ): Promise<void> {
    const identity = secureIdentityManager.getIdentity();
    if (!identity) throw new Error('Client identity not initialized');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Key exchange timeout'));
      }, this.connectionTimeout);

      secureConn.connection.on('data', (data: unknown) => {
        if (isKeyExchangeMessage(data)) {
          clearTimeout(timeout);
          secureConn.publicKey = data.publicKey;

          // Send client public key
          const message: KeyExchangeMessage = {
            type: 'KEY_EXCHANGE',
            publicKey: identity.keyPair.publicKey,
          };
          secureConn.connection.send(message);

          secureConn.verified = true;
          resolve();
        }
      });
    });
  }
}

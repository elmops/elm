import Peer, { type DataConnection, type PeerJSOption } from 'peerjs';

import { logger } from '@/2-process/1-utility/1-universal/Logging';
import {
  type NetworkTransport,
  ConnectionState,
} from '@/2-process/1-utility/1-universal/NetworkTransport';

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

export class WebRTCTransport implements NetworkTransport {
  private readonly peer: Peer;
  private readonly connections: Map<string, DataConnection> = new Map();
  private messageHandler: MessageHandler | null = null;
  private connectPromise: Promise<void> | null = null;
  // TODO: remove this?
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

  private setupConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on('data', (data) => {
      this.messageHandler?.(data);
    });

    // TODO: verify if this works
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
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.peer.destroy();
  }

  async send(data: unknown, retries = CONSTANTS.MAX_RETRIES): Promise<void> {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      await this.connect();
    }

    const sendWithRetry = async (attemptCount: number): Promise<void> => {
      try {
        if (this.isServer) {
          let sentCount = 0;
          this.connections.forEach((conn) => {
            if (conn.open) {
              conn.send(data);
              sentCount++;
            }
          });
          if (sentCount === 0) {
            throw new WebRTCConnectionError('No open connections available');
          }
        } else {
          if (!this.serverConnectionId) {
            throw new WebRTCConnectionError(
              'Server connection ID not configured'
            );
          }

          const serverConn = this.connections.get(this.serverConnectionId);
          if (!serverConn?.open) {
            throw new WebRTCConnectionError('No connection to server');
          }
          serverConn.send(data);
        }
      } catch (error) {
        if (attemptCount > 0) {
          const backoffDelay =
            CONSTANTS.RETRY_BASE_DELAY_MS *
            (CONSTANTS.MAX_RETRIES - attemptCount + 1);
          logger.warn(
            `Send failed, retrying in ${backoffDelay}ms. Attempts remaining: ${attemptCount}`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          return sendWithRetry(attemptCount - 1);
        }
        throw error;
      }
    };

    return sendWithRetry(retries);
  }

  onMessage(handler: (data: unknown) => void): void {
    this.messageHandler = handler;
  }

  private isClientOptions(
    options: WebRTCTransportOptions
  ): options is ClientOptions {
    return 'serverConnectionId' in options;
  }
}

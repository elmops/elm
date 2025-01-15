import Peer, { type DataConnection } from 'peerjs';

import {
  type NetworkTransport,
  ConnectionState,
} from '@/1-data/type/NetworkTransport';

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

export class WebRTCTransport implements NetworkTransport {
  private readonly peer: Peer;
  private readonly isServer: boolean;
  private readonly serverConnectionId?: string;
  private connection: DataConnection | null = null;
  private messageHandler: ((data: unknown) => void) | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;

  constructor(options: WebRTCTransportOptions) {
    this.isServer = !('serverConnectionId' in options);
    this.serverConnectionId =
      'serverConnectionId' in options ? options.serverConnectionId : undefined;

    const peerConfig = {
      host: options.config?.host || '0.peerjs.com',
      port: options.config?.port || 443,
      path: options.config?.path || '/',
      secure: options.config?.secure ?? true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
      debug: process.env.NODE_ENV === 'development' ? 2 : 0,
    };

    this.peer = new Peer(options.connectionId ?? '', peerConfig);
    this.setupPeerHandlers();
  }

  private setupPeerHandlers(): void {
    this.peer.on('open', () => {
      console.info('🚌[WebRTCTransport] Connected to PeerJS signaling server');

      if (!this.isServer && this.serverConnectionId) {
        const conn = this.peer.connect(this.serverConnectionId, {
          reliable: true,
          serialization: 'json',
        });

        this.setupDataConnectionHandlers(conn);
      }
    });

    if (this.isServer) {
      this.peer.on('connection', (conn) => {
        console.info('🚌[WebRTCTransport] Client connecting:', conn.peer);
        this.setupDataConnectionHandlers(conn);
      });
    }

    this.peer.on('error', (error) => {
      console.error('🚌[WebRTCTransport] PeerJS error:', error);
      this.updateConnectionState(ConnectionState.ERROR);
    });

    this.peer.on('disconnected', () => {
      console.info('🚌[WebRTCTransport] Disconnected from signaling server');
      this.updateConnectionState(ConnectionState.DISCONNECTED);
      this.peer.reconnect();
    });
  }

  private setupDataConnectionHandlers(conn: DataConnection): void {
    conn.on('open', () => {
      this.connection = conn;
      this.updateConnectionState(ConnectionState.CONNECTED);
      this.readyResolve?.();
      console.info('🚌[WebRTCTransport] Peer-to-peer connection established');
    });

    conn.on('data', (data) => {
      this.messageHandler?.(data);
    });

    conn.on('close', () => {
      if (this.connection === conn) {
        this.connection = null;
        this.updateConnectionState(ConnectionState.DISCONNECTED);
      }
    });

    conn.on('error', (error) => {
      console.error('🚌[WebRTCTransport] Peer connection error:', error);
      if (this.connection === conn) {
        this.connection = null;
        this.updateConnectionState(ConnectionState.ERROR);
      }
    });
  }

  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    console.info('🚌[WebRTCTransport] Connection state:', state);
  }

  // NetworkTransport implementation
  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) return;

    this.updateConnectionState(ConnectionState.CONNECTING);

    if (!this.readyPromise) {
      this.readyPromise = new Promise((resolve) => {
        this.readyResolve = resolve;
      });
    }

    return this.readyPromise;
  }

  async disconnect(): Promise<void> {
    this.connection?.close();
    this.connection = null;
    this.peer.destroy();
    this.updateConnectionState(ConnectionState.DISCONNECTED);
    this.readyPromise = null;
    this.readyResolve = null;
  }

  async send(data: unknown): Promise<void> {
    if (!this.connection) {
      throw new Error('No active connection');
    }
    this.connection.send(data);
  }

  onMessage(handler: (data: unknown) => void): void {
    this.messageHandler = handler;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }
}

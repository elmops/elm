import Peer, { type DataConnection } from 'peerjs';
import { logger } from '../utils/logger';

type TimerState = {
  startTime: number;
  elapsedTime: number;
  running: boolean;
};

type Message =
  | { type: 'timerState'; payload: TimerState }
  | { type: 'playPause'; payload: null }
  | { type: 'clientList'; payload: string[] }
  | { type: 'clientConnected'; payload: null };

export class PeerNetwork {
  private connections: Map<string, DataConnection> = new Map();
  private messageHandlers: Map<string, (payload: any) => void> = new Map();
  public peer: Peer;
  public isServer = false;
  public clientIds: string[] = [];

  constructor(id?: string) {
    this.peer = id ? new Peer(id) : new Peer();
    this.setupPeerEventListeners();
  }

  private setupPeerEventListeners() {
    this.peer.on('open', this.onOpen.bind(this));
    this.peer.on('connection', this.onConnection.bind(this));
    this.peer.on('error', this.onError.bind(this));
  }

  get peerId() {
    return this.peer.id;
  }

  /* Event Handlers */
  private onOpen(id: string) {
    console.log(`My peer ID is: ${id}`);
  }

  private onConnection(conn: DataConnection) {
    this.setupConnection(conn);
  }

  private setupConnection(conn: DataConnection) {
    const clientId = conn.peer;
    if (this.connections.has(clientId)) {
      logger.warn(`Client ${clientId} is already connected. Ignoring duplicate connection.`);
      conn.close();
      return;
    }
    
    this.connections.set(clientId, conn);
    this.clientIds.push(clientId);

    conn.on('open', () => this.onConnectionOpen(clientId));
    conn.on('data', (data: unknown) => this.handleMessage(data as Message));
    conn.on('close', () => this.onConnectionClose(clientId));
  }

  private onError(err: Error) {
    console.error('PeerJS error:', err);
  }

  private onConnectionOpen(clientId: string) {
    console.log('Connection opened with:', clientId);
    if (this.isServer) {
      this.broadcastClientList();
    } else {
      this.sendMessage('clientConnected', null);
      logger.log('Sending clientConnected message');
    }
  }

  private onConnectionClose(clientId: string) {
    console.log('Connection closed with:', clientId);
    this.connections.delete(clientId);
    this.clientIds = this.clientIds.filter(id => id !== clientId);

    if (this.isServer) {
      this.broadcastClientList();
    }
  }

  connect(peerId: string) {
    if (!this.connections.has(peerId)) {
      const conn = this.peer.connect(peerId);
      this.setupConnection(conn);
    }
  }

  sendMessage<T extends Message['type']>(
    type: T,
    payload: Extract<Message, { type: T }>['payload']
  ) {
    this.connections.forEach(conn => {
      conn.send({ type, payload } as Message);
    });
  }

  onMessage<T extends Message['type']>(
    type: T,
    handler: (payload: Extract<Message, { type: T }>['payload']) => void
  ) {
    this.messageHandlers.set(type, handler as (payload: any) => void);
  }

  private handleMessage(message: Message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.payload);
    } else {
      console.warn('No handler for message type:', message.type);
    }
  }

  disconnect() {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    this.clientIds = [];
    this.peer.disconnect();
  }

  becomeServer() {
    logger.log('Becoming server');
    this.isServer = true;
    this.broadcastClientList();
  }

  private broadcastClientList() {
    this.sendMessage('clientList', this.clientIds);
  }
}

export const createPeerNetwork = (id?: string): PeerNetwork => new PeerNetwork(id);

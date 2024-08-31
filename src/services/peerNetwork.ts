import Peer, { type DataConnection } from 'peerjs';

type TimerState = {
  startTime: number;
  elapsedTime: number;
  running: boolean;
};

type Message =
  | { type: 'timerState'; payload: TimerState }
  | { type: 'playPause'; payload: null }
  | { type: 'clientList'; payload: string[] };

export class PeerNetwork {
  private peer: Peer;
  private connections: Map<string, DataConnection> = new Map();
  private messageHandlers: Map<string, (payload: any) => void> = new Map();
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

  private onOpen(id: string) {
    console.log(`My peer ID is: ${id}`);
    if (this.isServer) {
      this.setupServerPeer();
    }
  }

  private onConnection(conn: DataConnection) {
    this.setupConnection(conn);
  }

  private onError(err: Error) {
    console.error('PeerJS error:', err);
  }

  private setupConnection(conn: DataConnection) {
    const clientId = conn.peer;
    this.connections.set(clientId, conn);
    this.clientIds.push(clientId);

    conn.on('open', () => this.onConnectionOpen(clientId));
    conn.on('data', (data: unknown) => this.handleMessage(data as Message));
    conn.on('close', () => this.onConnectionClose(clientId));
  }

  private onConnectionOpen(clientId: string) {
    console.log('Connection opened with:', clientId);
    if (this.isServer) {
      this.broadcastClientList();
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
    const conn = this.peer.connect(peerId);
    this.setupConnection(conn);
  }

  sendMessage(type: string, payload: any) {
    this.connections.forEach(conn => {
      conn.send({ type, payload });
    });
  }

  onMessage(type: string, handler: (payload: any) => void) {
    this.messageHandlers.set(type, handler);
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

  get peerId() {
    return this.peer.id;
  }

  becomeServer() {
    this.isServer = true;
    this.broadcastClientList();
  }

  private broadcastClientList() {
    this.sendMessage('clientList', this.clientIds);
  }

  private setupServerPeer() {
    this.isServer = true;
  }
}

export const createPeerNetwork = (id?: string): PeerNetwork => new PeerNetwork(id);

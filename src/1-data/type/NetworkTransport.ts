export interface NetworkTransport {
  readonly send: <T>(data: T) => Promise<void>;
  readonly onMessage: (handler: (data: unknown) => void) => void;
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

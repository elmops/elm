import type { NetworkTransport } from '@/1-data/type/NetworkTransport';

/**
 * Identity is an abstract representation of the physical person using the software.
 * It contains the user's public and private keys, their client, and the server they are hosting, if any.
 */
export interface Identity {
  id: string;
  keyPair: CryptoKeyPair;
  createdAt: number;
  client: NetworkTransport | null;
  server: NetworkTransport | null;
}

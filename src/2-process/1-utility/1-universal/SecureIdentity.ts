import { generateKeyPair, signData } from './Crypto';
import * as storage from './Storage';
import { v4 as uuidv4 } from 'uuid';

export interface SecureIdentity {
  id: string;
  keyPair: CryptoKeyPair;
  nonce: number;
  createdAt: number;
}

export interface SignedMessage<T> {
  payload: T;
  timestamp: number;
  nonce: number;
  senderId: string;
  signature: string;
}

export class SecureIdentityManager {
  private identity: SecureIdentity | null = null;
  private readonly storageKey = 'secure_identity';

  async initialize(): Promise<SecureIdentity> {
    const stored = await storage.get<SecureIdentity>(this.storageKey);
    if (stored) {
      this.identity = stored;
      return stored;
    }
    return this.create();
  }

  async create(): Promise<SecureIdentity> {
    const keyPair = await generateKeyPair();
    const identity: SecureIdentity = {
      id: uuidv4(),
      keyPair,
      nonce: 0,
      createdAt: Date.now(),
    };

    await storage.set(this.storageKey, identity);
    this.identity = identity;
    return identity;
  }

  async signMessage<T>(payload: T): Promise<SignedMessage<T>> {
    if (!this.identity) {
      throw new Error('Identity not initialized');
    }

    this.identity.nonce++;

    const message = {
      payload,
      timestamp: Date.now(),
      nonce: this.identity.nonce,
      senderId: this.identity.id,
    };

    const signature = await signData(message, this.identity.keyPair.privateKey);

    return {
      ...message,
      signature,
    };
  }

  getIdentity(): SecureIdentity | null {
    return this.identity;
  }
}

// Create singleton instance
export const secureIdentityManager = new SecureIdentityManager();

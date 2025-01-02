import { v4 as uuidv4 } from 'uuid';
import {
  generateKeyPair,
  signData,
  exportKeyPair,
  importKeyPair,
  type ExportedKeyPair,
} from '@/2-process/1-utility/1-universal/Crypto';
import * as storage from '@/2-process/1-utility/1-universal/Storage';

export interface SecureIdentity {
  id: string;
  keyPair: CryptoKeyPair;
  nonce: number;
  createdAt: number;
}

export interface SerializedSecureIdentity {
  id: string;
  keys: ExportedKeyPair;
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
    const stored = await storage.get<SerializedSecureIdentity>(this.storageKey);
    if (stored) {
      const keyPair = await importKeyPair(stored.keys);
      this.identity = {
        id: stored.id,
        keyPair,
        nonce: stored.nonce,
        createdAt: stored.createdAt,
      };
      return this.identity;
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

    // Store serialized version
    const exportedKeys = await exportKeyPair(keyPair);

    const serialized: SerializedSecureIdentity = {
      id: identity.id,
      keys: exportedKeys,
      nonce: identity.nonce,
      createdAt: identity.createdAt,
    };

    await storage.set(this.storageKey, serialized);
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

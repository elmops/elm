import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';

import type { Identity } from '@/1-data/type/Identity';
import { generateKeyPair } from '@/2-process/1-utility/1-universal/Crypto';
import * as storage from '@/2-process/1-utility/1-universal/Storage';
import { ApplicationError } from '@/2-process/1-utility/1-universal/ErrorManager';

const STORAGE_KEY = 'identity';

export const useIdentityStore = defineStore('identity', () => {
  const identity = ref<Identity | null>(null);

  async function initialize(): Promise<void> {
    try {
      const stored = await storage.get<Identity>(STORAGE_KEY);
      identity.value = stored || (await createNewIdentity());
    } catch (error) {
      throw new ApplicationError({
        code: 'IDENTITY_INIT_ERROR',
        message: 'Failed to initialize identity',
        context: {
          operation: 'initialize',
          storageKey: STORAGE_KEY,
          hasStoredIdentity: !!identity.value,
          originalError: error,
        },
      });
    }
  }

  async function createNewIdentity(): Promise<Identity> {
    try {
      const keyPair = await generateKeyPair();
      const newIdentity: Identity = {
        id: uuidv4(),
        keyPair,
        createdAt: Date.now(),
        client: null,
        server: null,
      };

      await storage.set(STORAGE_KEY, newIdentity);
      identity.value = newIdentity;
      return newIdentity;
    } catch (error) {
      throw new ApplicationError({
        code: 'IDENTITY_CREATE_ERROR',
        message: 'Failed to create new identity',
        context: {
          operation: 'createNewIdentity',
          storageKey: STORAGE_KEY,
          failedAt:
            error instanceof Error && error.message.includes('storage')
              ? 'storage'
              : 'keyGeneration',
          originalError: error,
        },
      });
    }
  }

  return {
    identity: computed(() => identity.value),
    hasIdentity: computed(() => identity.value !== null),
    initialize,
    createNewIdentity,
  };
});

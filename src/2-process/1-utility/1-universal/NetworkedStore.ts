import { defineStore, type StateTree } from 'pinia';

import type { Capability } from '@/1-data/type/Domain';

import { logger } from '@/2-process/1-utility/1-universal/Logging';
import type { AbstractEventBus } from '@/2-process/1-utility/1-universal/EventBus';
import { secureIdentityManager } from './SecureIdentity';
import type { Capability } from '@/1-data/type/Domain';

// Types
export interface StoreAction<T = unknown> {
  type: string;
  payload: T;
}

export interface StoreUpdate<T> {
  state: T;
  version: number;
  timestamp: number;
}

export interface NetworkedStoreOptions<T> {
  id: string;
  state: () => T;
  actions?: Record<string, (...args: any[]) => Promise<void> | void>;
}

export interface NetworkedStore<T> {
  readonly state: T;
  dispatch(action: StoreAction): Promise<void>;
  subscribe(handler: (update: StoreUpdate<T>) => void): () => void;
}

export interface SecureStoreAction<T = unknown> {
  type: string;
  payload: T;
  requiredCapability?: Capability;
}

export interface SecureStoreUpdate<T = unknown> {
  state: T;
  timestamp: number;
  version: number;
  signature: string;
  senderId: string;
}

// Development mode check
const isDev = process.env.NODE_ENV === 'development';

const logUpdate = (storeId: string, update: StoreUpdate<any>) => {
  if (isDev) {
    logger.log(
      `[Store: ${storeId}] State updated to version ${update.version}:`,
      update.state
    );
  }
};

const logAction = (storeId: string, action: StoreAction) => {
  if (isDev) {
    logger.log(
      `[Store: ${storeId}] Action dispatched: ${action.type}`,
      action.payload
    );
  }
};

// Factory
export function createNetworkedStore<T extends StateTree>(
  options: NetworkedStoreOptions<T>,
  eventBus: AbstractEventBus,
  isServer: boolean
): NetworkedStore<T> {
  let version = 0;
  const subscribers = new Set<(update: StoreUpdate<T>) => void>();

  const store = defineStore(options.id, {
    state: () => options.state(),
    actions: isServer ? options.actions : {},
  })();

  if (!isServer) {
    store.$state = new Proxy(store.$state, {
      set() {
        throw new Error('Cannot modify store state directly in client mode');
      },
      deleteProperty() {
        throw new Error('Cannot delete store properties in client mode');
      },
    });
  }

  if (isServer) {
    eventBus.on('STORE_ACTION', async (event) => {
      const { type, payload } = event.payload;
      logAction(options.id, event.payload);

      if (options.actions?.[type]) {
        await options.actions[type].call(store, payload);

        version++;
        const update: StoreUpdate<T> = {
          state: store.$state as T,
          timestamp: Date.now(),
          version,
        };

        logUpdate(options.id, update);
        eventBus.emit({
          type: 'STORE_UPDATE',
          payload: update,
          meta: {
            timestamp: Date.now(),
            sender: 'server',
          },
        });
      }
    });
  } else {
    eventBus.on('STORE_UPDATE', (event) => {
      const update = event.payload as StoreUpdate<T>;
      if (update.version > version) {
        version = update.version;
        Object.assign(store.$state, update.state);
        logUpdate(options.id, update);
        subscribers.forEach((handler) => handler(update));
      }
    });
  }

  return {
    get state() {
      return store.$state as T;
    },

    async dispatch(action: StoreAction) {
      logAction(options.id, action);

      if (isServer) {
        if (options.actions?.[action.type]) {
          await options.actions[action.type].call(store, action.payload);
        }
      } else {
        eventBus.emit({
          type: 'STORE_ACTION',
          payload: action,
          meta: {
            timestamp: Date.now(),
            sender: 'client',
          },
        });
      }
    },

    subscribe(handler: (update: StoreUpdate<T>) => void) {
      subscribers.add(handler);
      return () => subscribers.delete(handler);
    },
  };
}

export function createSecureNetworkedStore<T extends StateTree>(
  options: NetworkedStoreOptions<T>,
  eventBus: AbstractEventBus,
  isServer: boolean
): NetworkedStore<T> {
  let version = 0;
  const subscribers = new Set<(update: StoreUpdate<T>) => void>();

  const store = defineStore(options.id, {
    state: () => options.state(),
    actions: isServer ? options.actions : {},
  })();

  // Make state read-only for clients
  if (!isServer) {
    store.$state = new Proxy(store.$state, {
      set() {
        throw new Error('Cannot modify store state directly in client mode');
      },
      deleteProperty() {
        throw new Error('Cannot delete store properties in client mode');
      },
    });
  }

  if (isServer) {
    // Server: Handle incoming secure actions
    eventBus.on('SECURE_STORE_ACTION', async (event) => {
      const signedAction = event.payload;
      logAction(options.id, signedAction.payload);

      // Action verification happens in WebRTCServer before reaching here
      const action = signedAction.payload;

      if (options.actions?.[action.type]) {
        await options.actions[action.type].call(store, action.payload);

        version++;
        const update: StoreUpdate<T> = {
          state: store.$state as T,
          timestamp: Date.now(),
          version,
        };

        // Sign the update before broadcasting
        const signedUpdate = await secureIdentityManager.signMessage(update);

        logUpdate(options.id, update);
        eventBus.emit({
          type: 'SECURE_STORE_UPDATE',
          payload: signedUpdate,
          meta: {
            timestamp: Date.now(),
            sender: signedUpdate.senderId,
          },
        });
      }
    });
  } else {
    // Client: Handle incoming secure updates
    eventBus.on('SECURE_STORE_UPDATE', (event) => {
      const signedUpdate = event.payload;
      // Update verification happens in WebRTCClient before reaching here
      const update = signedUpdate.payload as StoreUpdate<T>;

      if (update.version > version) {
        version = update.version;
        Object.assign(store.$state, update.state);
        logUpdate(options.id, update);
        subscribers.forEach((handler) => handler(update));
      }
    });
  }

  return {
    get state() {
      return store.$state as T;
    },

    async dispatch(action: StoreAction) {
      logAction(options.id, action);

      if (isServer) {
        if (options.actions?.[action.type]) {
          await options.actions[action.type].call(store, action.payload);
        }
      } else {
        // In client mode, dispatch is handled by WebRTCClient
        throw new Error('Dispatch must be called through WebRTCClient');
      }
    },

    subscribe(handler: (update: StoreUpdate<T>) => void) {
      subscribers.add(handler);
      return () => subscribers.delete(handler);
    },
  };
}

// Helper function to create a store with proper typing
export function createStore<T extends StateTree>(
  options: NetworkedStoreOptions<T>,
  eventBus: AbstractEventBus,
  isServer: boolean,
  secure = true
): NetworkedStore<T> {
  return secure
    ? createSecureNetworkedStore(options, eventBus, isServer)
    : createNetworkedStore(options, eventBus, isServer);
}

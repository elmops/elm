import { defineStore, type StateTree } from 'pinia';

import type { Capability } from '@/1-data/type/Domain';

import type { AbstractEventBus } from '@/2-process/1-utility/1-universal/EventBus';

// Types
export interface StoreAction<T = unknown> {
  type: string;
  payload: T;
}

export interface StoreUpdate {
  state: StateTree;
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
  subscribe(handler: (update: StoreUpdate) => void): () => void;
}

export interface SecureStoreAction<T = unknown> {
  type: string;
  payload: T;
  requiredCapability?: Capability;
}

export interface SecureStoreUpdate {
  state: StateTree;
  timestamp: number;
  version: number;
  signature: string;
  senderId: string;
}

// Development mode check
const isDev = process.env.NODE_ENV === 'development';

const logUpdate = (storeId: string, update: StoreUpdate) => {
  if (isDev) {
    console.log(
      `[Store: ${storeId}] State updated to version ${update.version}:`,
      update.state
    );
  }
};

const logAction = (storeId: string, action: StoreAction) => {
  if (isDev) {
    console.log(
      `[Store: ${storeId}] Action dispatched: ${action.type}`,
      action.payload
    );
  }
};

/**
 * Create a networked store.
 * @param options - The options for the store.
 * @param eventBus - The event bus to use.
 * @param isServer - Whether the store is on the server.
 * @returns The networked store.
 */
export function createNetworkedStore<T extends StateTree>(
  options: NetworkedStoreOptions<T>,
  eventBus: AbstractEventBus,
  isServer: boolean
): NetworkedStore<T> {
  let version = 0;
  const subscribers = new Set<(update: StoreUpdate) => void>();

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
        const update: StoreUpdate = {
          state: store.$state,
          timestamp: Date.now(),
          version,
        };

        logUpdate(options.id, update);
        eventBus.emit({
          type: 'STORE_UPDATE',
          payload: update,
        });
      }
    });
  } else {
    // Client: Handle incoming updates
    eventBus.on('STORE_UPDATE', (event) => {
      const update = event.payload;

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

    subscribe(handler: (update: StoreUpdate) => void) {
      subscribers.add(handler);
      return () => subscribers.delete(handler);
    },
  };
}

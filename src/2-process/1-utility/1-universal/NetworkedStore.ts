import { defineStore, type StateTree } from 'pinia';
import type {
  AbstractEventBus,
  AppEvent,
} from '@/2-process/1-utility/1-universal/EventBus';

// Types
export interface StoreAction<T = unknown> {
  type: string;
  payload: T;
}

export interface StoreUpdate<T = unknown> {
  state: T;
  timestamp: number;
  version: number;
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

// Development mode check
const isDev = process.env.NODE_ENV === 'development';

const logUpdate = (storeId: string, update: StoreUpdate<any>) => {
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

// Factory
export function createNetworkedStore<T extends StateTree>(
  options: NetworkedStoreOptions<T>,
  eventBus: AbstractEventBus,
  isServer: boolean
): NetworkedStore<T> {
  let version = 0;
  const subscribers = new Set<(update: StoreUpdate<T>) => void>();

  // Create underlying Pinia store
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

  // Set up event handling
  if (isServer) {
    // Server: Handle incoming actions
    eventBus.on('STORE_ACTION', async (event: AppEvent<StoreAction>) => {
      const { type, payload } = event.payload;
      logAction(options.id, event.payload);

      if (options.actions?.[type]) {
        await options.actions[type].call(store, payload);

        // Broadcast state update
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
    // Client: Handle incoming state updates
    eventBus.on('STORE_UPDATE', (event: AppEvent<StoreUpdate<T>>) => {
      const update = event.payload;
      if (update.version > version) {
        version = update.version;
        Object.assign(store.$state, update.state);
        logUpdate(options.id, update);
        subscribers.forEach((handler) => handler(update));
      }
    });
  }

  // Return public interface
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

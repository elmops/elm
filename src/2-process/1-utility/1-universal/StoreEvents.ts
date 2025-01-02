import type { AppEvent } from '@/2-process/1-utility/1-universal/BaseEvents';
import type {
  StoreAction,
  StoreUpdate,
} from '@/2-process/1-utility/1-universal/NetworkedStore';

export interface StoreEventMap {
  STORE_ACTION: StoreAction;
  STORE_UPDATE: StoreUpdate;
}

export type StoreEvent<K extends keyof StoreEventMap> = AppEvent<
  StoreEventMap[K],
  K
>;

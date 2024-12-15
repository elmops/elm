import type { StoreAction, StoreUpdate } from './NetworkedStore';
import type { AppEvent } from './BaseEvents';

export interface StoreEventMap {
  STORE_ACTION: StoreAction;
  STORE_UPDATE: StoreUpdate<any>;
}

export type StoreEvent<K extends keyof StoreEventMap> = AppEvent<
  StoreEventMap[K],
  K
>;

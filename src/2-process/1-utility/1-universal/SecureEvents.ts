import type { SignedMessage } from './SecureIdentity';
import type { StoreAction, StoreUpdate } from './NetworkedStore';
import type { AppEvent } from './BaseEvents';

export interface SecureEventMap {
  SECURE_STORE_ACTION: SignedMessage<StoreAction>;
  SECURE_STORE_UPDATE: SignedMessage<StoreUpdate<any>>;
  SERVER_KEY_EXCHANGE: { publicKey: JsonWebKey };
  CLIENT_KEY_EXCHANGE: SignedMessage<{ publicKey: JsonWebKey }>;
  REQUEST_INITIAL_STATE: SignedMessage<{ clientId: string }>;
  INITIAL_STATE: SignedMessage<StoreUpdate<any>>;
}

export type SecureEvent<K extends keyof SecureEventMap> = AppEvent<
  SecureEventMap[K],
  K
>;

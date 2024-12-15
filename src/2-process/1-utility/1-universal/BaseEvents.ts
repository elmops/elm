export interface EventMeta {
  readonly timestamp: number;
  readonly sender: string;
  readonly target?: string;
}

export interface AppEvent<T, K extends string = string> {
  readonly type: K;
  readonly payload: T;
  readonly meta?: EventMeta;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface BaseEventMap {
  ERROR: ErrorPayload;
}

export type BaseEvent<K extends keyof BaseEventMap> = AppEvent<
  BaseEventMap[K],
  K
>;

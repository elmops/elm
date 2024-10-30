// types/timer.ts
export interface TimerState {
  readonly displayTime: number;
  readonly isRunning: boolean;
  readonly isPaused: boolean;
}

export interface TimerActions {
  readonly updateDisplay: (time: number) => void;
  readonly start: () => void;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly stop: () => void;
  readonly reset: () => void;
}

export type TimerStore = TimerState & TimerActions;

export type TimerStoreState = () => TimerState;

export type TimerStoreActions = {
  readonly [K in keyof TimerActions]: TimerActions[K];
};
// types/timer.ts
export interface TimerState {
  displayTime: number;
  isRunning: boolean;
  isPaused: boolean;
}

export interface TimerActions {
  updateDisplay: (time: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

export type TimerStore = TimerState & TimerActions;

export type TimerStoreState = () => TimerState;

export type TimerStoreActions = {
  [K in keyof TimerActions]: TimerActions[K];
};
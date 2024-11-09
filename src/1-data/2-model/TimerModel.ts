// types/timer.ts
export type TimerState = {
  displayTime: number;
  isRunning: boolean;
  isPaused: boolean;
};

export type TimerActions = {
  updateDisplay: (time: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
};

export type TimerStore = TimerState & TimerActions;

export type TimerStoreState = () => TimerState;

export type TimerStoreActions = {
  [K in keyof TimerActions]: TimerActions[K];
};

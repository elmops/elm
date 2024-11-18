// State
export type Timer = {
  displayTime: number;
  isRunning: boolean;
  isPaused: boolean;
};

// Actions
export type TimerActions = {
  updateDisplay: (time: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
};

// Store
export type TimerStore = Timer & TimerActions;

export type TimerStoreState = () => Timer;

export type TimerStoreActions = {
  [K in keyof TimerActions]: TimerActions[K];
};

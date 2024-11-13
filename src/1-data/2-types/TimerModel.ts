import type { Timer } from '@/1-data/1-schema/TimerType';

// todo: separate actions, get rid of model

export type TimerActions = {
  updateDisplay: (time: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
};

export type TimerStore = Timer & TimerActions;

export type TimerStoreState = () => Timer;

export type TimerStoreActions = {
  [K in keyof TimerActions]: TimerActions[K];
};

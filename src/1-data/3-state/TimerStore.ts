// stores/timerStore.ts
import { defineStore } from 'pinia';
import type { TimerStoreState } from 'src/1-data/2-model/TimerModel.ts';

const initialState: TimerStoreState = () => ({
  displayTime: 0,
  isRunning: false,
  isPaused: false,
});

export const useTimerStore = defineStore('timer', {
  state: initialState,
  actions: {
    updateDisplay(time: number): void {
      const hasSecondChanged =
        Math.floor(time / 1000) !== Math.floor(this.displayTime / 1000);

      if (hasSecondChanged) {
        this.displayTime = time;
      }
    },

    start(): void {
      this.isRunning = true;
      this.isPaused = false;
    },

    pause(): void {
      this.isPaused = true;
    },

    resume(): void {
      this.isPaused = false;
    },

    stop(): void {
      this.isRunning = false;
      this.isPaused = false;
    },

    reset(): void {
      this.displayTime = 0;
      this.stop();
    },
  },
});

// Type-safe way to get store instance type
export type TimerStoreInstance = ReturnType<typeof useTimerStore>;

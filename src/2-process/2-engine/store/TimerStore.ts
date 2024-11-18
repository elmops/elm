import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { Timer } from '@/1-data/type/Timer';

export const useTimerStore = defineStore('timer', () => {
  // State initialized from interface
  const state = ref<Timer>({
    displayTime: 0,
    isRunning: false,
    isPaused: false,
  });

  // Actions
  function updateDisplay(time: number): void {
    const hasSecondChanged =
      Math.floor(time / 1000) !== Math.floor(state.value.displayTime / 1000);

    if (hasSecondChanged) {
      state.value.displayTime = time;
    }
  }

  function start(): void {
    state.value.isRunning = true;
    state.value.isPaused = false;
  }

  function pause(): void {
    state.value.isPaused = true;
  }

  function resume(): void {
    state.value.isPaused = false;
  }

  function stop(): void {
    state.value.isRunning = false;
    state.value.isPaused = false;
  }

  function reset(): void {
    state.value.displayTime = 0;
    stop();
  }

  return {
    // State
    state,
    // Actions
    updateDisplay,
    start,
    pause,
    resume,
    stop,
    reset,
  };
});

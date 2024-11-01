import { ref, computed } from 'vue';
import type { TimerType } from '@schema/TimerType';

export function useTimerState() {
  const timerState = ref<TimerType>({ startTime: 0, elapsedTime: 0, running: false });
  const lastUpdateTime = ref(0);
  const formattedTime = computed(() => {
    const totalSeconds = Math.floor(timerState.value.elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  function updateTimer(currentTime: number) {
    if (timerState.value.running) {
      const deltaTime = currentTime - lastUpdateTime.value;
      timerState.value.elapsedTime += deltaTime;
    }
    lastUpdateTime.value = currentTime;
    requestAnimationFrame(updateTimer);
  }

  return { timerState, formattedTime, updateTimer };
}

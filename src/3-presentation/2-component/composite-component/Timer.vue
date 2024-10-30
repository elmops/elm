<template>
  <div>
    <div id="timer">{{ formattedTime }}</div>
    <button @click="playPause">{{ timerState.running ? 'Pause' : 'Play' }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTimerState } from '@manager/manager/useTimerState';

const { timerState, formattedTime, updateTimer } = useTimerState();

onMounted(() => {
  requestAnimationFrame(updateTimer);
});

function playPause() {
  timerState.running = !timerState.running;
  if (timerState.running) {
    timerState.startTime = performance.now();
  }
}
</script>



// server 

// client

state management
pinia store
- main store includes all the models

engines
- timerEnginer (controls the state)

ui
    - timer components
        - reflects timer state


Meeting -
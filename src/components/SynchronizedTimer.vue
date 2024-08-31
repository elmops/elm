<template>
  <div>
    <h2>Synchronized Timer</h2>
    <div id="timer">{{ formattedTime }}</div>
    <button @click="playPause">{{ timerState.running ? 'Pause' : 'Play' }}</button>
    <div>
      <input v-model="roomId" placeholder="Enter room ID" />
      <button @click="joinRoom">Join Room</button>
    </div>
    <button @click="createRoom">Create Room</button>
    <div id="status">Status: {{ status }}</div>
    <ConnectedClients v-if="peerNetwork.isServer" :clients="connectedClients" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { createPeerNetwork } from '../services/peerNetwork';
import { useTimerState } from '../composables/useTimerState';
import { useNetworkHandlers } from '../composables/useNetworkHandlers';
import ConnectedClients from '../components/ConnectedClients.vue';

const peerNetwork = createPeerNetwork();
const { timerState, formattedTime, updateTimer, broadcastTimerState } = useTimerState();
const roomId = ref('');
const connectedClients = ref<string[]>([]);

const status = computed(() => {
  if (!peerNetwork || peerNetwork.peerId === undefined) return "Not Connected";
  return peerNetwork.isServer
    ? `Host (Room ID: ${peerNetwork.peerId})`
    : `Client (Connected to: ${roomId.value})`;
});

const { playPause, createRoom, joinRoom } = useNetworkHandlers(
  peerNetwork,
  timerState,
  broadcastTimerState,
  roomId,
  connectedClients
);

onMounted(() => {
  requestAnimationFrame(updateTimer);
});

onUnmounted(() => {
  peerNetwork.disconnect();
});
</script>

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
    <ConnectedClients :clients="connectedClients" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import type { PeerNetwork } from '../services/peerNetwork';
import { createPeerNetwork } from '../services/peerNetwork';
import { useTimerState } from '../composables/useTimerState';
import { useNetworkHandlers } from '../composables/useNetworkHandlers';
import ConnectedClients from '../components/ConnectedClients.vue';
import { logger } from '../utils/logger';

const { timerState, formattedTime, updateTimer } = useTimerState();
const peerNetwork = ref<PeerNetwork | null>(null);
const roomId = ref<string>('');
const connectedClients = ref<string[]>([]);

onMounted(() => {
  peerNetwork.value = createPeerNetwork();
  requestAnimationFrame(updateTimer);
  peerNetwork.value.peer.on('open', (id: string) => {
    roomId.value = id;
  });
});

const status = computed(() => {
  if (!peerNetwork.value) return "Connecting...";
  logger.log('peerNetwork', peerNetwork.value.peerId);
  logger.log('roomId', roomId.value);
  return peerNetwork.value.isServer
    ? `Host (Room ID: ${peerNetwork.value.peerId})`
    : `Client (Connected to: ${roomId.value || 'Not connected'})`;
});

const { playPause, createRoom, joinRoom } = useNetworkHandlers(
  peerNetwork as Ref<PeerNetwork | null>,
  timerState,
  roomId,
  connectedClients
);

onUnmounted(() => {
  peerNetwork.value?.disconnect();
});
</script>

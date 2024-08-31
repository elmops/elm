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
    <div v-if="peerNetwork.isServer && connectedClients.length > 0">
      <h3>Connected Clients:</h3>
      <ul>
        <li v-for="clientId in connectedClients" :key="clientId">{{ clientId }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { createPeerNetwork } from '../services/peerNetwork';

const peerNetwork = createPeerNetwork();
const timerState = ref({ startTime: 0, elapsedTime: 0, running: false });
const lastUpdateTime = ref(0);
const roomId = ref('');
const connectedClients = ref<string[]>([]);

const status = computed(() => {
  if (!peerNetwork || peerNetwork.peerId === undefined) {
    return "Not Connected";
  }

  if (peerNetwork.isServer) {
    return `Host (Room ID: ${peerNetwork.peerId})`;
  }

  return `Client (Connected to: ${roomId.value})`;
});

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

  if (peerNetwork.isServer && currentTime - timerState.value.startTime >= 5000) {
    broadcastTimerState();
    timerState.value.startTime = currentTime;
  }

  requestAnimationFrame(updateTimer);
}

function broadcastTimerState() {
  peerNetwork.sendMessage('timerState', timerState.value);
}

function playPause() {
  if (peerNetwork.isServer) {
    timerState.value.running = !timerState.value.running;

    if (timerState.value.running) {
      timerState.value.startTime = performance.now();
    }

    broadcastTimerState();
  } else {
    peerNetwork.sendMessage('playPause', null);
  }
}

function createRoom() {
  peerNetwork.becomeServer();

  peerNetwork.onMessage('playPause', () => {
    timerState.value.running = !timerState.value.running;

    if (timerState.value.running) {
      timerState.value.startTime = performance.now();
    }

    broadcastTimerState();
  });

  peerNetwork.onMessage('clientList', (clients: string[]) => {
    connectedClients.value = clients;
  });
}

function joinRoom() {
  if (roomId.value) {
    peerNetwork.connect(roomId.value);

    peerNetwork.onMessage('timerState', (newState) => {
      timerState.value = newState;
    });

    peerNetwork.onMessage('clientList', (clients: string[]) => {
      connectedClients.value = clients;
    });
  }
}

onMounted(() => {
  lastUpdateTime.value = performance.now();
  requestAnimationFrame(updateTimer);
});

onUnmounted(() => {
  peerNetwork.disconnect();
});
</script>

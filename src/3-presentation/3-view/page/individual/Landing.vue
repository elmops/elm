<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-md p-6">
      <FwbHeading tag="h2" class="text-center mb-8">Meetings</FwbHeading>
      
      <div class="space-y-6">
        <!-- Timer Display -->
        <div class="text-center">
          <div class="text-5xl font-mono mb-4">{{ formattedTime }}</div>
          <FwbButton 
            color="default"
            @click="playPause"
          >
            {{ timerState.running ? 'Pause' : 'Play' }}
          </FwbButton>
        </div>

        <!-- Room Controls -->
        <div class="space-y-4">
          <div class="flex gap-2">
            <FwbInput
              v-model="roomId"
              placeholder="Enter room ID"
              class="flex-grow"
            />
            <FwbButton
              color="alternative"
              @click="joinRoom"
            >
              Join Room
            </FwbButton>
          </div>

          <FwbButton
            color="default"
            class="w-full"
            @click="onCreateMeeting"
          >
            Create New Meeting
          </FwbButton>
        </div>

        <!-- Status -->
        <div class="mt-4">
          <FwbAlert :color="peerNetwork?.isServer ? 'success' : 'info'">
            {{ status }}
          </FwbAlert>
        </div>

        <!-- Connected Clients -->
        <ConnectedClients :clients="connectedClients" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import type { PeerNetwork } from '@manager/adapter/peerNetwork';
import { createPeerNetwork } from '@manager/adapter/peerNetwork';
import { useTimerState } from '@manager/manager/useTimerState';
import { useNetworkHandlers } from '@manager/manager/useNetworkHandlers';
import ConnectedClients from '@component/composite-component/ConnectedClients.vue';
import { logger } from '@utility/Logging';
import { useRouter } from 'vue-router';
import {
  FwbButton,
  FwbInput,
  FwbHeading,
  FwbAlert
} from 'flowbite-vue';

const { timerState, formattedTime, updateTimer } = useTimerState();
const peerNetwork = ref<PeerNetwork | null>(null);
const roomId = ref<string>('');
const connectedClients = ref<string[]>([]);
const router = useRouter();

onMounted(() => {
  peerNetwork.value = createPeerNetwork();
  requestAnimationFrame(updateTimer);
  peerNetwork.value.peer.on('open', (id: string) => {
    roomId.value = id;
  });
});

const status = computed(() => {
  if (!peerNetwork.value) {
    return "Connecting...";
  }

  logger.log('peerNetwork', peerNetwork.value.peerId);
  logger.log('roomId', roomId.value);

  return peerNetwork.value.isServer
    ? `Host (Room ID: ${peerNetwork.value.peerId})`
    : `Client (Connected to: ${roomId.value || 'Not connected'})`;
});

const { playPause, joinRoom } = useNetworkHandlers(
  peerNetwork as Ref<PeerNetwork | null>,
  timerState,
  roomId,
  connectedClients
);

const onCreateMeeting = async () => {
  router.push('/setup');
};

onUnmounted(() => {
  peerNetwork.value?.disconnect();
});
</script>

<style scoped>
.font-mono {
  font-family: ui-monospace, monospace;
}
</style>

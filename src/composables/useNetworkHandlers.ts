import type { Ref } from 'vue';
import type { PeerNetwork } from '../services/peerNetwork';

export function useNetworkHandlers(
  peerNetwork: PeerNetwork,
  timerState: Ref<{ startTime: number; elapsedTime: number; running: boolean }>,
  broadcastTimerState: () => void,
  roomId: Ref<string>,
  connectedClients: Ref<string[]>
) {
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

  return { playPause, createRoom, joinRoom };
}
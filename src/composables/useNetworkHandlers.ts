import type { Ref } from 'vue';
import type { PeerNetwork } from '../services/peerNetwork';
import { logger } from '../utils/logger';

export function useNetworkHandlers(
  peerNetwork: Ref<PeerNetwork | null>,
  timerState: Ref<{ startTime: number; elapsedTime: number; running: boolean }>,
  roomId: Ref<string | undefined>,
  connectedClients: Ref<string[]>
) {

  function broadcastTimerState() {
    logger.log('Broadcasting timer state:', timerState.value);
    peerNetwork.value?.sendMessage('timerState', timerState.value);
  }

  function playPause() {
    if (peerNetwork.value?.isServer) {
      timerState.value.running = !timerState.value.running;

      if (timerState.value.running) {
        timerState.value.startTime = performance.now();
      }
      
      broadcastTimerState();
    } else {
      peerNetwork.value?.sendMessage('playPause', null);
    }
  }

  function createRoom() {
    logger.log('Creating room');
    peerNetwork.value?.becomeServer();

    peerNetwork.value?.onMessage('playPause', () => {
      timerState.value.running = !timerState.value.running;
      if (timerState.value.running) {
        timerState.value.startTime = performance.now();
      }
      broadcastTimerState();
    });

    peerNetwork.value?.onMessage('clientList', (clients: string[]) => {
      connectedClients.value = clients;
    });

    peerNetwork.value?.onMessage('clientConnected', () => {
      logger.log('Client connected, broadcasting timer state');
      broadcastTimerState();
    });
  }

  function joinRoom() {
    if (roomId.value) {
      peerNetwork.value?.connect(roomId.value);

      peerNetwork.value?.onMessage('timerState', (newState) => {
        timerState.value = newState;
      });

      peerNetwork.value?.onMessage('clientList', (clients: string[]) => {
        connectedClients.value = clients;
      });
    } else {
      logger.error('Room ID is empty');
    }
  }

  return { playPause, createRoom, joinRoom, connectedClients };
}
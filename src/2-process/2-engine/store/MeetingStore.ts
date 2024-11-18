import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';

import type {
  Meeting,
  MeetingState,
  MeetingTemplate,
} from '@/1-data/type/Meeting';

export const useMeetingStore = defineStore('meeting', () => {
  // State
  const state = ref<MeetingState>({
    currentMeeting: null,
    isHost: false,
    isConnecting: false,
    error: null,
  });

  // Getters
  const currentMeeting = computed(() => state.value.currentMeeting);
  const isHost = computed(() => state.value.isHost);
  const isConnecting = computed(() => state.value.isConnecting);
  const error = computed(() => state.value.error);
  const meetingId = computed(() => state.value.currentMeeting?.id);

  // Actions
  function createMeeting(template: MeetingTemplate): Meeting {
    const meeting: Meeting = {
      id: uuidv4(),
      template,
      participants: [],
      currentPhase: 0,
      isActive: false,
    };

    state.value.currentMeeting = meeting;
    state.value.isHost = true;
    state.value.error = null;

    return meeting;
  }

  function setError(error: string | null) {
    state.value.error = error;
  }

  function setConnecting(connecting: boolean) {
    state.value.isConnecting = connecting;
  }

  function clearMeeting() {
    state.value.currentMeeting = null;
    state.value.isHost = false;
    state.value.error = null;
  }

  function updateMeeting(meeting: Meeting) {
    state.value.currentMeeting = meeting;
  }

  return {
    // State
    state,

    // Getters
    currentMeeting,
    isHost,
    isConnecting,
    error,
    meetingId,

    // Actions
    createMeeting,
    setError,
    setConnecting,
    clearMeeting,
    updateMeeting,
  };
});

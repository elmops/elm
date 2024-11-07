<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-md p-6">
      <FwbHeading tag="h2" class="text-center mb-8">Meetings</FwbHeading>
      
      <div class="space-y-6">
        <!-- Room Controls -->
        <div class="space-y-4">
          <FwbInput
            v-model="agent.name"
            placeholder="Enter your name"
            class="w-full"
          />
          <div class="flex gap-2">
            <FwbInput
              v-model="roomId"
              placeholder="Enter room ID"
              class="flex-grow"
              :disabled="isConnecting"
            />
            <FwbButton
              color="default"
              @click="joinRoom"
              :disabled="!agent.name || !roomId || isConnecting"
            >
              <template v-if="isConnecting">
                <span class="animate-spin mr-2">⌛</span>
                Joining...
              </template>
              <template v-else>
                Join Room
              </template>
            </FwbButton>
          </div>

          <FwbButton
            color="alternative"
            class="w-full"
            @click="onCreateMeeting"
            :disabled="!agent.name"
          >
            Create New Meeting
          </FwbButton>
        </div>
      </div>

      <!-- Error Alert -->
      <FwbAlert 
        v-if="error" 
        color="red" 
        class="mt-4"
        dismissible
        @dismiss="clearError"
      >
        {{ error }}
      </FwbAlert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { FwbButton, FwbInput, FwbHeading, FwbAlert } from 'flowbite-vue';

import { useAgentStore } from '@/1-data/3-state/AgentStore';
import { useMeetingStore } from '@/1-data/3-state/MeetingStore';
import { meetingService } from '@/2-process/2-engine/MeetingService';

const router = useRouter();
const agentStore = useAgentStore();
const meetingStore = useMeetingStore();

const { agent } = storeToRefs(agentStore);
const { isConnecting, error } = storeToRefs(meetingStore);

const roomId = ref<string>('');

const joinRoom = async () => {
  try {
    if (!agent.value.name) {
      meetingStore.setError('Please enter your name before joining');
      return;
    }

    await meetingService.joinMeeting(roomId.value);
    router.push(`/meeting/${roomId.value}`);
  } catch (error) {
    console.error('Failed to join room:', error);
  }
};

const onCreateMeeting = () => {
  if (!agent.value.name) {
    meetingStore.setError('Please enter your name before creating a meeting');
    return;
  }
  router.push('/setup');
};

const clearError = () => {
  meetingStore.setError(null);
};
</script>

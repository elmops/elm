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
            />
            <FwbButton
              color="default"
              @click="joinRoom"
              :disabled="!agent.name || !roomId"
            >
              Join Room
            </FwbButton>
          </div>

          <FwbButton
            color="alternative"
            class="w-full"
            @click="onCreateMeeting"
          >
            Create New Meeting
          </FwbButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { FwbButton, FwbInput, FwbHeading } from 'flowbite-vue';

import { useAgentStore } from 'src/1-data/3-state/AgentStore';

const router = useRouter();

const agentStore = useAgentStore();
const { agent } = storeToRefs(agentStore);

const roomId = ref<string>('');

const joinRoom = () => {
  // TODO: Implement room joining logic
  console.log('Joining room:', roomId.value);
};

const onCreateMeeting = () => {
  router.push('/setup');
};
</script>

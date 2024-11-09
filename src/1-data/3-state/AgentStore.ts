import { defineStore } from 'pinia';
import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { Agent } from '@/1-data/1-schema/AgentType';

export const useAgentStore = defineStore('agent', () => {
  const agent = ref<Agent>({
    id: uuidv4(),
    name: '',
    roles: [],
    speakingTimeQuota: 0,
  });

  const updateName = (name: string) => {
    agent.value.name = name;
  };

  return {
    agent,
    updateName,
  };
});

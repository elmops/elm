import { defineStore } from 'pinia';
import { ref } from 'vue';

interface Agent {
  id: string;
  name?: string;
  roles: string[];
  speakingTimeQuota: number;
}

export const useAgentStore = defineStore('agent', () => {
  const agent = ref<Agent>({
    id: crypto.randomUUID(),
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

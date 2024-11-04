<template>
  <div>
    <!-- Back Navigation -->
    <div class="mb-6">
      <FwbA 
        :href="landingHref"
        @click.prevent="router.push('/landing')"
        class="inline-flex items-center gap-2 hover:underline"
      >
        <ArrowLeft :stroke-width="3" class="h-6 w-6" />
        <span>Back</span>
      </FwbA>
    </div>

    <FwbHeading tag="h2" class="mb-6">Meeting Configuration</FwbHeading>
    
    <!-- Template Controls -->
    <div class="flex gap-4 mb-6">
      <FwbButton color="alternative" size="sm" @click="saveTemplate">
        Save Template
      </FwbButton>
      
      <label>
        <FwbButton color="alternative" size="sm" @click="$refs.fileInput.click()">
          Load Template
        </FwbButton>
        <input
          ref="fileInput"
          type="file"
          accept="application/json"
          class="hidden"
          @change="loadTemplate"
        >
      </label>
    </div>
    
    <!-- Meeting Name Input -->
    <div class="mb-6">
      <FwbInput
        v-model="template.name"
        size="lg"
        class="text-xl font-medium"
        placeholder="Enter Meeting Name"
      />
    </div>

    <!-- Meeting Phases -->
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <FwbHeading tag="h3" size="text-lg">Meeting Phases</FwbHeading>
        <FwbButton color="default" size="sm" @click="addPhase">
          <template #prefix>
            <AlarmClockPlus class="h-5 w-5" />
          </template>
          <span class="whitespace-nowrap">Add Phase</span>
        </FwbButton>
      </div>
      
      <div v-if="template.phases.length === 0" 
           class="flex flex-col items-center justify-center p-8 border rounded-lg bg-gray-50">
        <AlarmClock :stroke-width="1.5" class="h-12 w-12 text-gray-400 mb-2" />
        <span class="text-gray-500">No phases added yet</span>
      </div>

      <div v-else
        v-for="(phase, index) in template.phases" 
        :key="index"
        class="flex items-center justify-between p-2 border rounded-lg bg-white shadow-sm"
      >
                  <FwbInput
          v-model="phase.name"
          @update:model-value="updatePhaseName(index, $event)"
          class="w-1/3"
          size="sm"
          placeholder="Phase Name"
        />
          <FwbInput
            :model-value="String(phase.duration)"
            @update:model-value="updatePhaseDuration(index, Number($event))"
            class="w-20 text-left"
            min="0"
            size="sm"
          >
            <template #suffix>
      <div class="text-sm text-gray-400">min</div>
    </template>
        </FwbInput>

          <div class="flex items-center gap-2">
            <FwbToggle
            label="Admin Time" reverse
              v-model="phase.isAdminTime"
              class="whitespace-nowrap"
            />
          </div>
          <FwbButton color="red" outline size="lg" @click="removePhase(index)">
            <Trash2 class="h-4 w-4" />
          </FwbButton>

      </div>

      <!-- Meeting Summary -->
      <FwbAlert color="info" class="mt-4">
        <div class="flex items-center gap-2">
          <Clock class="h-5 w-5" />
          Total Meeting Time: <span class="font-medium">{{ totalTime }} minutes</span>
        </div>
      </FwbAlert>

      <!-- Participants -->
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <FwbHeading tag="h3" size="text-lg">Connected Participants</FwbHeading>
        </div>
        
        <div v-if="participants.length === 0" 
             class="flex flex-col items-center justify-center p-8 border rounded-lg bg-gray-50">
          <Users :stroke-width="1.5" class="h-12 w-12 text-gray-400 mb-2" />
          <span class="text-gray-500">No participants connected</span>
        </div>
        
        <div v-else
          v-for="(participant, index) in participants" 
          :key="index"
          class="flex items-center justify-between p-2 gap-4 border rounded-lg bg-white shadow-sm"
        >
          <div class="grow">{{ participant.name }}</div>
          <FwbBadge color="purple">
            <template #icon>
              <Clock class="h-4 w-4" />
            </template>
            <span class="whitespace-nowrap">&nbsp;{{ personTime.toFixed(1) }} min</span>
          </FwbBadge>
        </div>
      </div>

      <FwbButton color="default" class="w-full mt-6" size="lg" @click="startMeeting">
        Start Meeting
      </FwbButton>
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  FwbButton,
  FwbInput,
  FwbToggle,
  FwbHeading,
  FwbAlert,
  FwbBadge,
  FwbA,
} from 'flowbite-vue';
import {
  Trash2,
  Clock,
  AlarmClockPlus,
  AlarmClock,
  Users,
  ArrowLeft,
} from 'lucide-vue-next';

interface Phase {
  name: string;
  duration: number;
  isAdminTime: boolean;
}

interface Participant {
  id: string;
  name: string;
}

interface MeetingTemplate {
  name: string;
  phases: Phase[];
}

const defaultTemplate: MeetingTemplate = {
  name: 'Default Meeting',
  phases: [
    { name: 'Welcome', duration: 5, isAdminTime: true },
    { name: 'Check-ins', duration: 10, isAdminTime: false },
    { name: 'Main Discussion', duration: 40, isAdminTime: false },
    { name: 'Closing', duration: 5, isAdminTime: true },
  ],
};

// Reactive state
const template = ref<MeetingTemplate>(defaultTemplate);
const participants = ref<Participant[]>([]);

// Computed properties
const totalTime = computed(() => {
  return template.value.phases.reduce((sum, phase) => sum + phase.duration, 0);
});

const personTime = computed(() => {
  const adminTime = template.value.phases
    .filter((phase) => phase.isAdminTime)
    .reduce((sum, phase) => sum + phase.duration, 0);
  const totalPersonTime = totalTime.value - adminTime;
  return participants.value.length > 0
    ? totalPersonTime / participants.value.length
    : 0;
});

// Methods
const addPhase = () => {
  const newPhase: Phase = {
    name: 'New Phase',
    duration: 0,
    isAdminTime: false,
  };
  template.value.phases.push(newPhase);
};

const removePhase = (index: number) => {
  template.value.phases.splice(index, 1);
};

const updatePhaseName = (index: number, name: string) => {
  template.value.phases[index].name = name;
};

const updatePhaseDuration = (index: number, duration: number) => {
  if (index < template.value.phases.length) {
    template.value.phases[index].duration = Math.max(0, duration);
  }
};

const startMeeting = () => {
  console.log('Starting meeting with configuration:', {
    template: template.value,
    participants: participants.value,
  });
};

const saveTemplate = () => {
  const data = {
    template: template.value,
    participants: participants.value,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.value.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  link.click();

  URL.revokeObjectURL(url);
};

const loadTemplate = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      template.value = data.template;
      participants.value = data.participants;
    } catch (error) {
      console.error('Error parsing template file:', error);
    }
  };
  reader.readAsText(file);
};

const router = useRouter();
const landingHref = computed(() => router.resolve('/landing').href);
</script>

<template>
  <div class="container mx-auto p-4">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { secureIdentityManager } from '@/2-process/1-utility/1-universal/SecureIdentity';

onMounted(async () => {
  await secureIdentityManager.initialize();
});
</script>

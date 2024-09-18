<template>
    <div v-if="clients.length > 0">
      <h3>Connected Clients:</h3>
      <ul>
        <li v-for="clientId in clients" :key="clientId">{{ clientId }}</li>
      </ul>
    </div>
  </template>
  
  <script setup lang="ts">
  defineProps<{
    clients: string[]
  }>();
  </script>
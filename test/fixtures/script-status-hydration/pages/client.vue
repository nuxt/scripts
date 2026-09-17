<script setup lang="ts">
const { status } = useScript('/probe.js?trigger=client', { trigger: 'client' })
useStatusLog('client', status)
</script>

<template>
  <div id="status">{{ status }}</div>
</template>

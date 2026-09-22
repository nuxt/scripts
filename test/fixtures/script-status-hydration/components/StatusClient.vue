<script setup lang="ts">
const { status } = useScript('/probe.js?trigger=lazy-client', { trigger: 'client' })
useStatusLog('lazy-client', status)
</script>

<template>
  <div id="status">{{ status }}</div>
</template>

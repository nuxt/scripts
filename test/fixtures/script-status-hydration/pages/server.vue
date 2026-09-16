<script setup lang="ts">
const { status } = useScript('/probe.js?trigger=server', { trigger: 'server' })
useStatusLog('server', status)
</script>

<template>
  <div id="status">{{ status }}</div>
</template>

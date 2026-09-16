<script setup lang="ts">
const { status } = useScript('/probe.js?trigger=manual', { trigger: 'manual' })
useStatusLog('manual', status)
</script>

<template>
  <div id="status">{{ status }}</div>
</template>

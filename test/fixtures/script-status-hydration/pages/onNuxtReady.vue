<script setup lang="ts">
const { status } = useScript('/probe.js?trigger=onNuxtReady', { trigger: 'onNuxtReady' })
useStatusLog('onNuxtReady', status)
</script>

<template>
  <div id="status">{{ status }}</div>
</template>

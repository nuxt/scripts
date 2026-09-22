<script setup lang="ts">
const { status } = useScript('/probe.js?trigger=default')
useStatusLog('default', status)
</script>

<template>
  <div id="status">{{ status }}</div>
</template>

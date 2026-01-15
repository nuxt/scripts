<script setup lang="ts">
// Load script in partytown web worker
useScript('/worker-script.js', { partytown: true })
</script>

<template>
  <div>
    <h1>Partytown Test</h1>
  </div>
</template>

<script setup lang="ts">
// For partytown, we need the script in SSR HTML - use useHead directly
useHead({
  script: [
    { src: '/worker-script.js', type: 'text/partytown' },
  ],
})
</script>

<template>
  <div>
    <h1>Partytown Test</h1>
    <div id="status">
      Ready
    </div>
  </div>
</template>

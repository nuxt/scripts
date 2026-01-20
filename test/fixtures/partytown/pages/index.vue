<script setup lang="ts">
// Load custom script in partytown web worker
useScript('/worker-script.js', { partytown: true })

// Load Plausible Analytics - known to work well with Partytown
// Using script.plausible.io which is the real Plausible script
useScript('https://plausible.io/js/script.js', {
  partytown: true,
  // data-domain is required but doesn't need to be valid for script to load
  scriptOptions: {
    defer: true,
  },
})

const plausibleReady = ref(false)
onMounted(() => {
  // Plausible creates window.plausible function
  const check = () => {
    plausibleReady.value = typeof window.plausible === 'function'
  }
  // Check multiple times as partytown may take a moment
  setTimeout(check, 500)
  setTimeout(check, 1500)
  setTimeout(check, 3000)
})
</script>

<template>
  <div>
    <h1>Partytown Test</h1>
    <div id="status">
      Ready
    </div>
    <div id="plausible-status">
      plausible: {{ plausibleReady ? 'ready' : 'loading...' }}
    </div>
  </div>
</template>

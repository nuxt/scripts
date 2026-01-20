<script setup lang="ts">
// Set up forwarded function to capture worker execution
if (import.meta.client) {
  (window as any).testFn = (msg: string) => {
    (window as any).__partytownExecuted = msg
  }
}

// Load script in partytown web worker
useScript('/worker-script.js', { partytown: true })
</script>

<template>
  <div>
    <h1>Partytown Test</h1>
    <div id="status">
      Ready
    </div>
  </div>
</template>

<template>
  <div>
    <h1>CDN URL Test</h1>
    <button @click="loadScript">
      Load Script
    </button>
    <div id="script-status">
      {{ scriptStatus }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const scriptStatus = ref('ready')

function loadScript() {
  const { $script } = useScript('https://cdn.jsdelivr.net/npm/confetti-js@0.0.18/dist/index.min.js', {
    bundle: true,
    use() {
      return {
        ConfettiGenerator: window.ConfettiGenerator,
      }
    },
  })

  $script.then(() => {
    scriptStatus.value = 'loaded'
    // Script loaded successfully
  }).catch(() => {
    scriptStatus.value = 'error'
  })
}
</script>

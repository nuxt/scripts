<script lang="ts" setup>
import { ref } from 'vue'
import { useHead, useScriptHotjar } from '#imports'

useHead({
  title: 'Hotjar - First Party',
})

const { status } = useScriptHotjar({
  id: 3925006,
})

const clickCount = ref(0)
</script>

<template>
  <div>
    <h1>Hotjar First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button id="test-button" @click="clickCount++">
        Click me ({{ clickCount }})
      </button>
      <input id="test-input" type="text" placeholder="Type something...">
      <div id="scroll-area" style="height: 200px; overflow-y: scroll;">
        <div style="height: 500px; padding: 20px;">
          Scroll content for Hotjar tracking
        </div>
      </div>
    </div>
  </div>
</template>

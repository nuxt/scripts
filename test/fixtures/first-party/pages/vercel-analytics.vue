<script lang="ts" setup>
import { ref } from 'vue'
import { useHead, useScriptVercelAnalytics } from '#imports'

useHead({
  title: 'Vercel Analytics - First Party',
})

const { status } = useScriptVercelAnalytics()

const clickCount = ref(0)
</script>

<template>
  <div>
    <h1>Vercel Analytics First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button id="test-button" @click="clickCount++">
        Click me ({{ clickCount }})
      </button>
    </div>
  </div>
</template>

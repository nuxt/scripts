<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Google Analytics',
})

// composables return the underlying api as a proxy object and the script state
const { proxy, status } = useScriptGoogleAnalytics({
  id: 'G-TR58L0EF8P',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// Use proxy to send events - proxy automatically handles script loading
proxy.gtag('event', 'page_view', {
  page_title: 'Google Analytics',
  page_location: 'https://harlanzw.com/third-parties/google-analytics',
  page_path: '/third-parties/google-analytics',
})

function triggerConversion() {
  proxy.gtag('event', 'conversion')
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Google Analytics
      </h1>
    </div>

    <div>
      <span class="font-medium">Status:</span>
      <span class="ml-2 px-2 py-1 rounded text-sm" :class="status === 'loaded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'">
        {{ status }}
      </span>
    </div>

    <UButton :disabled="status !== 'loaded'" @click="triggerConversion">
      Trigger Conversion
    </UButton>
  </div>
</template>

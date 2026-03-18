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
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
    </ClientOnly>
    <button @click="triggerConversion">
      Trigger Conversion
    </button>
  </div>
</template>

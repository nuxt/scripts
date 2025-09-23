<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Google Analytics - Multiple Instances',
})

// Load multiple Google Analytics instances with different keys
const { proxy: proxy1, status: status1 } = useScriptGoogleAnalytics({
  key: 'gtag1',
  id: 'G-TR58L0EF8P',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const { proxy: proxy2, status: status2 } = useScriptGoogleAnalytics({
  key: 'gtag2',
  id: 'G-1234567890',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// Use proxy to send events
proxy1.gtag('event', 'page_view', {
  page_title: 'Google Analytics - Multiple',
  page_location: 'https://harlanzw.com/third-parties/google-analytics/multiple',
  page_path: '/third-parties/google-analytics/multiple',
})

function triggerConversion() {
  proxy2.gtag('event', 'conversion')
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        1 status: {{ status1 }}
      </div>
    </ClientOnly>
    <ClientOnly>
      <div>
        2 status: {{ status2 }}
      </div>
    </ClientOnly>
    <button @click="triggerConversion">
      Trigger Conversion
    </button>
  </div>
</template>

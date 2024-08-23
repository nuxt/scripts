<script lang="ts" setup>
import { useHead, useScriptGoogleAnalytics } from '#imports'

useHead({
  title: 'Google Analytics',
})

// composables return the underlying api as a proxy object and the script state
const { gtag: gtag1, status: status1 } = useScriptGoogleAnalytics({
  key: 'gtag1',
  id: 'G-TR58L0EF8P',
})

const { gtag: gtag2, status: status2 } = useScriptGoogleAnalytics({
  key: 'gtag2',
  id: 'G-1234567890',
})

// id set via nuxt scripts module config
gtag1('event', 'page_view', {
  page_title: 'Google Analytics',
  page_location: 'https://harlanzw.com/third-parties/google-analytics',
  page_path: '/third-parties/google-analytics',
})

function triggerConversion() {
  gtag2('event', 'conversion')
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

<script lang="ts" setup>
import { useHead, useScriptGoogleAnalytics } from '#imports'

useHead({
  title: 'Google Analytics',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { gtag: gtag1, $script: $script1 } = useScriptGoogleAnalytics({
  id: 'G-TR58L0EF8P',
  dataLayerName: 'dataLayer1',
})

const { gtag: gtag2, $script: $script2 } = useScriptGoogleAnalytics({
  key: 'test',
  id: 'G-123456',
  dataLayerName: 'dataLayer2',
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
        1 status: {{ $script1.status.value }}
      </div>
    </ClientOnly>
    <ClientOnly>
      <div>
        2 status: {{ $script2.status.value }}
      </div>
    </ClientOnly>
    <button @click="triggerConversion">
      Trigger Conversion
    </button>
  </div>
</template>

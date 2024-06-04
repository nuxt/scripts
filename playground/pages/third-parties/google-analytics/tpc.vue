<script lang="ts" setup>
import { useHead } from '#imports'
import { useScriptGoogleAnalyticsTpc } from '~/composables/useScriptGoogleAnalyticsTpc'

useHead({
  title: 'Google Analytics TPC',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { gtag, $script } = useScriptGoogleAnalyticsTpc({
  id: 'G-TR58L0EF8P',
}) // id set via nuxt scripts module config
gtag('event', 'page_view', {
  page_title: 'Google Analytics',
  page_location: 'https://harlanzw.com/third-parties/google-analytics',
  page_path: '/third-parties/google-analytics',
})

function triggerConversion() {
  gtag('event', 'conversion')
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status.value }}
      </div>
    </ClientOnly>
    <button @click="triggerConversion">
      Trigger Conversion
    </button>
  </div>
</template>

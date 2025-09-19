<script lang="ts" setup>
import { useHead } from '#imports'
import { useScriptGoogleAnalytics } from '#nuxt-scripts/registry/google-analytics'

useHead({
  title: 'Google Analytics',
})

// composables return the underlying api as a proxy object and the script state
const { proxy, status } = useScriptGoogleAnalytics({
  id: 'G-TR58L0EF8P',
  onBeforeGtagStart(gtag) {
    gtag('consent', 'default', {
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      ad_storage: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    })
  },
}) // id set via nuxt scripts module config
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

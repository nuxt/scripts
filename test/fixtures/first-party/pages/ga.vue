<script lang="ts" setup>
import { useHead, useScriptGoogleAnalytics } from '#imports'

useHead({
  title: 'Google Analytics - First Party',
})

const { proxy, status } = useScriptGoogleAnalytics({
  id: 'G-TR58L0EF8P',
})

function triggerConversion() {
  proxy.gtag('event', 'conversion', {
    // Include some data that would typically be fingerprinting
    send_to: 'G-TR58L0EF8P',
  })
}

function triggerPageView() {
  proxy.gtag('event', 'page_view', {
    page_title: 'Test Page',
    page_location: window.location.href,
  })
}
</script>

<template>
  <div>
    <h1>Google Analytics First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div>
      <button id="trigger-conversion" @click="triggerConversion">
        Trigger Conversion
      </button>
      <button id="trigger-pageview" @click="triggerPageView">
        Trigger Page View
      </button>
    </div>
  </div>
</template>

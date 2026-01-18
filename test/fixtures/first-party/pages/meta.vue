<script lang="ts" setup>
import { useHead, useScriptMetaPixel } from '#imports'

useHead({
  title: 'Meta Pixel - First Party',
})

const { proxy, status } = useScriptMetaPixel({
  id: '3925006',
})

function trackPageView() {
  proxy.fbq('track', 'PageView')
}

function trackEvent() {
  proxy.fbq('track', 'ViewContent', {
    content_name: 'Test Product',
    content_category: 'Testing',
  })
}
</script>

<template>
  <div>
    <h1>Meta Pixel First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button id="trigger-pageview" @click="trackPageView">
        Track PageView
      </button>
      <button id="trigger-event" @click="trackEvent">
        Track Event
      </button>
    </div>
  </div>
</template>

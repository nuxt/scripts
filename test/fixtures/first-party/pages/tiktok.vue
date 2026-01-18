<script lang="ts" setup>
import { useHead, useScriptTikTokPixel } from '#imports'

useHead({
  title: 'TikTok Pixel - First Party',
})

const { proxy, status } = useScriptTikTokPixel({
  id: 'TEST_PIXEL_ID',
})

function trackPageView() {
  proxy.ttq('page')
}

function trackEvent() {
  proxy.ttq('track', 'ViewContent', {
    content_type: 'product',
    content_id: 'test-123',
  })
}
</script>

<template>
  <div>
    <h1>TikTok Pixel First-Party Test</h1>
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

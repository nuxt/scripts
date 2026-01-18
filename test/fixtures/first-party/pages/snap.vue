<script lang="ts" setup>
import { useHead, useScriptSnapchatPixel } from '#imports'

useHead({
  title: 'Snapchat Pixel - First Party',
})

const { proxy, status } = useScriptSnapchatPixel({
  id: '2295cbcc-cb3f-4727-8c09-1133b742722c',
})

function trackPageView() {
  proxy.snaptr('track', 'PAGE_VIEW')
}

function trackEvent() {
  proxy.snaptr('track', 'VIEW_CONTENT', {
    item_category: 'Testing',
  })
}
</script>

<template>
  <div>
    <h1>Snapchat Pixel First-Party Test</h1>
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

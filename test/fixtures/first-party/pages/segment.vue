<script lang="ts" setup>
import { useHead, useScriptSegment } from '#imports'

useHead({
  title: 'Segment - First Party',
})

const { proxy, status } = useScriptSegment({
  writeKey: import.meta.env.NUXT_PUBLIC_SCRIPTS_SEGMENT_WRITE_KEY || 'YOUR_WRITE_KEY',
})

function trackPage() {
  proxy.analytics.page('Test Page')
}

function trackEvent() {
  proxy.analytics.track('Button Clicked', {
    button_name: 'test_button',
  })
}
</script>

<template>
  <div>
    <h1>Segment First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button id="trigger-page" @click="trackPage">
        Track Page
      </button>
      <button id="trigger-event" @click="trackEvent">
        Track Event
      </button>
    </div>
  </div>
</template>

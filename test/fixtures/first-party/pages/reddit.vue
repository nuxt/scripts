<script lang="ts" setup>
import { useHead, useScriptRedditPixel } from '#imports'

useHead({
  title: 'Reddit Pixel - First Party',
})

const { proxy, status } = useScriptRedditPixel({
  id: 't2_test_advertiser_id',
})

function trackPageVisit() {
  proxy.rdt('track', 'PageVisit')
}

function trackEvent() {
  proxy.rdt('track', 'ViewContent')
}
</script>

<template>
  <div>
    <h1>Reddit Pixel First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button id="trigger-pagevisit" @click="trackPageVisit">
        Track PageVisit
      </button>
      <button id="trigger-event" @click="trackEvent">
        Track Event
      </button>
    </div>
  </div>
</template>

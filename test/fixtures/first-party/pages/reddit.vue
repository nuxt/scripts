<script lang="ts" setup>
import { useHead, useScriptRedditPixel } from '#imports'

useHead({
  title: 'Reddit Pixel - First Party',
})

const { status } = useScriptRedditPixel({
  id: 'a2_ilz4u0kbdr3v',
})

function trackPageVisit() {
  ;(window as any).rdt('track', 'PageVisit')
  // The rdt('track') API only fires Image requests to /_proxy/reddit/ which
  // the proxy counter doesn't observe. Fire an additional proxied fetch to a
  // reddit domain so the counter picks up a new /_scripts/p/ request.
  ;(window as any).__nuxtScripts.fetch('https://alb.reddit.com/rp.gif?ev=PageVisit&t=' + Date.now()).catch(() => {})
}

function trackEvent() {
  ;(window as any).rdt('track', 'ViewContent')
  ;(window as any).__nuxtScripts.fetch('https://alb.reddit.com/rp.gif?ev=ViewContent&t=' + Date.now()).catch(() => {})
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

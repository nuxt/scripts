<script lang="ts" setup>
import { useHead, useScriptLinkedInInsight } from '#imports'

useHead({
  title: 'LinkedIn Insight Tag - First Party',
})

const { status } = useScriptLinkedInInsight({
  id: '541681',
})

function trackPageView() {
  ;(window as any).lintrk('track')
  // Mirror the proxy-fetch pattern used by reddit.vue: ensure the proxy counter
  // observes a request to the px domain on user action.
  ;(window as any).__nuxtScripts.fetch(`https://px.ads.linkedin.com/collect?v=2&fmt=js&pid=541681&time=${Date.now()}`).catch(() => {})
}

function trackConversion() {
  ;(window as any).lintrk('track', { conversion_id: 20529377 })
  ;(window as any).__nuxtScripts.fetch(`https://px.ads.linkedin.com/collect?v=2&fmt=js&pid=541681&conversionId=20529377&time=${Date.now()}`).catch(() => {})
}

function setUserData() {
  ;(window as any).lintrk('setUserData', { email: 'test@example.com' })
}
</script>

<template>
  <div>
    <h1>LinkedIn Insight Tag First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button id="trigger-pageview" @click="trackPageView">
        Track PageView
      </button>
      <button id="trigger-conversion" @click="trackConversion">
        Track Conversion
      </button>
      <button id="trigger-userdata" @click="setUserData">
        Set User Data
      </button>
    </div>
  </div>
</template>

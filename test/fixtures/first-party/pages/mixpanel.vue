<script lang="ts" setup>
import { useHead, useScriptMixpanelAnalytics } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Mixpanel - First Party' })
const { status, proxy } = useScriptMixpanelAnalytics({ token: '8fa1d44274ff7526b3788cf1c119050c' })
const result = ref('')

function trackEvent() {
  proxy.mixpanel.track('Test Button Click', { source: 'first-party-test' })
  result.value = 'Event tracked'
}

function trackPageview() {
  proxy.mixpanel.track('$mp_web_page_view')
  result.value = 'Pageview tracked'
}
</script>

<template>
  <div>
    <h1>Mixpanel First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="trackPageview">
        Track Pageview
      </button>
      <button @click="trackEvent">
        Track Event
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>

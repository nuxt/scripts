<script lang="ts" setup>
import { useHead, useScriptMatomoAnalytics } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Matomo - First Party' })
const { status, proxy } = useScriptMatomoAnalytics({ cloudId: 'demo.matomo.cloud', siteId: '1' })
const result = ref('')

function trackPageview() {
  proxy._paq.push(['trackPageView'])
  result.value = 'Pageview tracked'
}

function trackEvent() {
  proxy._paq.push(['trackEvent', 'Test', 'Click', 'Button'])
  result.value = 'Event tracked'
}
</script>

<template>
  <div>
    <h1>Matomo First-Party Test</h1>
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

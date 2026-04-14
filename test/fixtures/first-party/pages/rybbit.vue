<script lang="ts" setup>
import { useHead, useScriptRybbitAnalytics } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Rybbit - First Party' })
const { status, proxy } = useScriptRybbitAnalytics({ siteId: '874' })
const result = ref('')

function trackPageview() {
  proxy.rybbit.pageview()
  result.value = 'Pageview tracked'
}

function trackEvent() {
  proxy.rybbit.event('test_click', { button: 'primary' })
  result.value = 'Event tracked'
}
</script>

<template>
  <div>
    <h1>Rybbit First-Party Test</h1>
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

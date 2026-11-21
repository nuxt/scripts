<script lang="ts" setup>
import { useHead, useScriptMetricRavenAnalytics } from '#imports'
import { ref } from 'vue'

useHead({ title: 'MetricRaven - First Party' })
const { status, proxy } = useScriptMetricRavenAnalytics({ siteId: 'ana_pub_example', scriptOptions: { trigger: 'client' } })
const result = ref('')

function trackEvent() {
  proxy.track('test_click', { button: 'primary' })
  result.value = 'Event tracked'
}
</script>

<template>
  <div>
    <h1>MetricRaven First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="trackEvent">
        Track Event
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useHead, useScriptPulseAnalytics } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Pulse - First Party' })
const { status, proxy } = useScriptPulseAnalytics({ domain: 'example.com', scriptOptions: { trigger: 'client' } })
const result = ref('')

function trackEvent() {
  proxy.track('test_click', { button: 'primary' })
  result.value = 'Event tracked'
}

function trackPurchase() {
  proxy.track('purchase', { product: 'annual_plan' }, 99)
  result.value = 'Purchase tracked'
}
</script>

<template>
  <div>
    <h1>Pulse First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="trackEvent">
        Track Event
      </button>
      <button @click="trackPurchase">
        Track Purchase
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>

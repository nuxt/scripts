<script lang="ts" setup>
import { useHead, useScriptPlausibleAnalytics } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Plausible - First Party' })
const { status } = useScriptPlausibleAnalytics({ domain: 'scripts.nuxt.com', extension: 'local' })
const result = ref('')

function trackCustomEvent() {
  window.plausible('Test Button Click ' + Date.now(), { props: { variant: 'primary' } })
  result.value = 'Custom event sent'
}

function trackRevenue() {
  window.plausible('Purchase ' + Date.now(), { revenue: { currency: 'USD', amount: 9.99 }, props: { product: 'test' } })
  result.value = 'Revenue event sent'
}
</script>

<template>
  <div>
    <h1>Plausible First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="trackCustomEvent">
        Track Custom Event
      </button>
      <button @click="trackRevenue">
        Track Revenue Event
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>

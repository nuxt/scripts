<script lang="ts" setup>
import { useHead, useScriptBingUet } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Bing UET - First Party' })
const { status, proxy } = useScriptBingUet({ id: '247021147' })
const result = ref('')

function trackEvent() {
  proxy.uetq.push('event', 'test_action', { event_category: 'testing', event_label: 'button_click' })
  result.value = 'Event tracked'
}
</script>

<template>
  <div>
    <h1>Bing UET First-Party Test</h1>
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

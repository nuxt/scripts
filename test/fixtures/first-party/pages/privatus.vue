<script lang="ts" setup>
import { useHead, useScriptPrivatusAnalytics } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Privatus Analytics - First Party' })
const { status, proxy } = useScriptPrivatusAnalytics({ site: 'pa_test123', scriptOptions: { trigger: 'client' } })
const result = ref('')

function trackEvent() {
  proxy.track('Test Click', { button: 'primary' })
  result.value = 'Event tracked'
}
</script>

<template>
  <div>
    <h1>Privatus Analytics First-Party Test</h1>
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

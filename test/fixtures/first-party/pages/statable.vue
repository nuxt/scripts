<script lang="ts" setup>
import { useHead, useScriptStatableAnalytics } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Statable - First Party' })
const { status, proxy } = useScriptStatableAnalytics({ siteId: '123456', scriptOptions: { trigger: 'client' } })
const result = ref('')

function trackEvent() {
  proxy.t('Test Click', { button: 'primary' })
  result.value = 'Event tracked'
}
</script>

<template>
  <div>
    <h1>Statable First-Party Test</h1>
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

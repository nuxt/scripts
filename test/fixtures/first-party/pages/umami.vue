<script lang="ts" setup>
import { useHead, useScriptUmamiAnalytics } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Umami - First Party' })
const { status } = useScriptUmamiAnalytics({ websiteId: 'ae15c227-67e8-434a-831f-67e6df88bd6c' })
const result = ref('')

function trackEvent() {
  ;(window as any).umami.track('test_click_' + Date.now(), { button: 'primary' })
  result.value = 'Event tracked'
}
</script>

<template>
  <div>
    <h1>Umami First-Party Test</h1>
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

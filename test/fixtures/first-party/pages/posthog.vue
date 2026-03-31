<script lang="ts" setup>
import { useHead, useScriptPostHog } from '#imports'
import { ref } from 'vue'

useHead({ title: 'PostHog - First Party' })
const { status, proxy } = useScriptPostHog({
  apiKey: 'phc_CkMaDU6dr11eJoQdAiSJb1rC324dogk3T952gJ6fD9W',
  region: 'us',
  config: { autocapture: false, capture_pageview: true },
})
const result = ref('')

function captureEvent() {
  proxy.posthog.capture('test_button_clicked', { source: 'first-party-test' })
  result.value = 'Event captured'
}

function identify() {
  proxy.posthog.identify('test-user-123', { email: 'test@example.com' })
  result.value = 'User identified'
}
</script>

<template>
  <div>
    <h1>PostHog First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="captureEvent">
        Capture Event
      </button>
      <button @click="identify">
        Identify User
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>

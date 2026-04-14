<script lang="ts" setup>
import { useHead, useScriptIntercom } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Intercom - First Party' })
const { status, proxy } = useScriptIntercom({ app_id: 'akg5rmxb' })
const result = ref('')

function showMessenger() {
  proxy.Intercom('show')
  result.value = 'Messenger shown'
}

function trackEvent() {
  proxy.Intercom('trackEvent', 'test-event', { source: 'first-party-test' })
  result.value = 'Event tracked'
}
</script>

<template>
  <div>
    <h1>Intercom First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="showMessenger">
        Show Messenger
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

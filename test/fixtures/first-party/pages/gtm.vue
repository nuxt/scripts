<script lang="ts" setup>
import { useHead, useScriptGoogleTagManager } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Google Tag Manager - First Party' })
const { status, proxy } = useScriptGoogleTagManager({ id: 'GTM-MWW974PF' })
const result = ref('')

function pushEvent() {
  proxy.dataLayer.push({ event: 'test_event', category: 'testing', action: 'click' })
  result.value = 'Event pushed to dataLayer'
}
</script>

<template>
  <div>
    <h1>Google Tag Manager First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="pushEvent">
        Push DataLayer Event
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useHead, useScriptUsercentrics } from '#imports'

useHead({ title: 'Usercentrics' })

const { status, consent } = useScriptUsercentrics()

const consentEvents = ref(0)
if (import.meta.client) {
  consent.onConsentChange(() => {
    consentEvents.value += 1
  })
}
</script>

<template>
  <div>
    <h1>Usercentrics</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
      <div id="consent-events">
        events: {{ consentEvents }}
      </div>
    </ClientOnly>
  </div>
</template>

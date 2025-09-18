<script lang="ts" setup>
import { ref } from 'vue'
import { useScriptGoogleAnalytics, useScriptTriggerConsent } from '#imports'

const agreedCookies = ref(false)
const triggerCalled = ref(false)

useScriptGoogleAnalytics({
  id: 'G-H9LK49C4ZH',
  scriptOptions: {
    trigger: useScriptTriggerConsent({
      consent: agreedCookies,
      // load 3 seconds after consent is granted
      postConsentTrigger: () => new Promise<void>(resolve =>
        setTimeout(resolve, 3000),
      ),
    }),
  },
})
</script>

<template>
  <div>Post Consent Trigger is called: {{ triggerCalled }}</div>
</template>

<script lang="ts" setup>
import { navigateTo, useHead, useScriptLinkedInInsight } from '#imports'

useHead({ title: 'LinkedIn Insight Tag' })

const { status } = useScriptLinkedInInsight()

function trackConversion() {
  ;(window as any).lintrk('track', { conversion_id: 1111111177 })
}

function trackConversionWithEventId() {
  ;(window as any).lintrk('track', { conversion_id: 1111111177, event_id: 'per-event-id-test' })
}

function setUserData() {
  ;(window as any).lintrk('setUserData', { email: 'test@example.com' })
}

function navigateSpa() {
  navigateTo('/linkedin-spa')
}
</script>

<template>
  <div>
    <h1>LinkedIn Insight Tag</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div>
      <button id="trigger-conversion" @click="trackConversion">
        Track Conversion
      </button>
      <button id="trigger-conversion-eventid" @click="trackConversionWithEventId">
        Track Conversion (with event_id)
      </button>
      <button id="trigger-userdata" @click="setUserData">
        Set User Data
      </button>
      <button id="trigger-spa-nav" @click="navigateSpa">
        Navigate (SPA)
      </button>
    </div>
  </div>
</template>

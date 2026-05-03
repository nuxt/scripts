<script lang="ts" setup>
import { useHead, useScriptLinkedInInsight } from '#imports'

useHead({
  title: 'LinkedIn Insight Tag',
})

// Showcases the full lintrk surface: track (page-view + conversion),
// setUserData (enhanced matching), and SPA route tracking. The SPA
// hook fires automatically on page:finish — buttons trigger the
// remaining commands manually.
const { status, proxy } = useScriptLinkedInInsight({
  id: '111143',
  enableAutoSpaTracking: true,
})

function trackPageView() {
  proxy.lintrk('track')
}

function trackConversion() {
  proxy.lintrk('track', { conversion_id: 1111111177, event_id: crypto.randomUUID() })
}

function setUserData() {
  proxy.lintrk('setUserData', { email: 'test@example.com' })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <div class="space-x-2 mt-2">
        <UButton @click="trackPageView">
          Track PageView
        </UButton>
        <UButton @click="trackConversion">
          Track Conversion
        </UButton>
        <UButton @click="setUserData">
          Set User Data
        </UButton>
        <UButton to="/">
          Navigate (SPA)
        </UButton>
      </div>
    </ClientOnly>
  </div>
</template>

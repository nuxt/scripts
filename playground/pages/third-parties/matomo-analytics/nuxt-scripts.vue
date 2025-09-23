<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Matomo Analytics',
})

// composables return the underlying api as a proxy object and the script state
const { status, proxy } = useScriptMatomoAnalytics({
  matomoUrl: 'https://nuxt.matomo.cloud/',
  siteId: '1',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// Test the issue: Use proxy to track events and goals
// Note: setTrackerUrl and setSiteId are automatically set by the registry based on matomoUrl and siteId options
proxy._paq.push(['trackPageView'])

// Test custom events and goals that were not working in the original issue
function trackCustomEvent() {
  proxy._paq.push(['trackEvent', 'Test', 'Button Click', 'Proxy Test'])
}

function trackGoal() {
  proxy._paq.push(['trackGoal', 1])
}

function testDirectPaq() {
  // Test direct window._paq usage for comparison
  if (window._paq) {
    window._paq.push(['trackEvent', 'Test', 'Button Click', 'Direct Test'])
  }
}
</script>

<template>
  <div>
    <h1>Matomo Analytics Test</h1>
    <ClientOnly>
      <div>
        <p>Script status: {{ status }}</p>

        <div style="margin: 20px 0;">
          <UButton @click="trackCustomEvent" style="margin-right: 10px; padding: 10px;">
            Track Custom Event (proxy._paq)
          </UButton>
          <UButton @click="trackGoal" style="padding: 10px;">
            Track Goal (proxy._paq)
          </UButton>
        </div>

        <div style="margin: 20px 0;">
          <UButton @click="testDirectPaq" style="margin-right: 10px; padding: 10px;">
            Track Event (direct window._paq)
          </UButton>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

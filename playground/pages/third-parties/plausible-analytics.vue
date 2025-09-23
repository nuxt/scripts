<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Plausible',
})

// composables return the underlying api as a proxy object and the script state
const { status, proxy } = useScriptPlausibleAnalytics({
  domain: 'scripts.nuxt.com',
  extension: 'local',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const clicks = ref(0)

function trackPageView() {
  proxy('404', { props: { path: '/404' } })
}

async function clickHandler() {
  clicks.value++
  proxy('test', { props: { clicks: clicks.value } })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Plausible Analytics
      </h1>
      <p class="text-gray-600 mt-2">
        Privacy-focused web analytics platform with custom event tracking.
      </p>
    </div>

    <div class="space-y-4">
      <div>
        <span class="font-medium">Status:</span>
        <span class="ml-2 px-2 py-1 rounded text-sm" :class="status === 'loaded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'">
          {{ status }}
        </span>
      </div>

      <div class="flex gap-3">
        <UButton
          :disabled="status !== 'loaded'"
          @click="trackPageView"
        >
          Track 404 Page View
        </UButton>

        <UButton
          :disabled="status !== 'loaded'"
          @click="clickHandler"
        >
          Track Custom Event ({{ clicks }})
        </UButton>
      </div>
    </div>
  </div>
</template>

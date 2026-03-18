<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Plausible v2',
})

// New October 2025 format with scriptId
const { status, proxy } = useScriptPlausibleAnalytics({
  scriptId: 'gYyxvZhkMzdzXBAtSeSNz',
  captureOnLocalhost: true,
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const clicks = ref(0)

function trackPageView() {
  proxy.plausible('404', { props: { path: '/404' } })
}

async function clickHandler() {
  clicks.value++
  proxy.plausible('test', { props: { clicks: clicks.value } })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Plausible Analytics v2 (October 2025)
      </h1>
      <p class="text-gray-600 mt-2">
        New format with unique script ID and plausible.init() configuration.
      </p>
    </div>

    <div class="space-y-4">
      <div>
        <span class="font-medium">Status:</span>
        <span class="ml-2 px-2 py-1 rounded text-sm" :class="status === 'loaded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'">
          {{ status }}
        </span>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 class="font-semibold mb-2">
          Configuration
        </h3>
        <pre class="text-xs bg-white p-2 rounded overflow-x-auto">scriptId: 'gYyxvZhkMzdzXBAtSeSNz'
captureOnLocalhost: true</pre>
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

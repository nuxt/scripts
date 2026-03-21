<script lang="ts" setup>
import { useHead, useScriptGoogleAnalytics } from '#imports'

useHead({
  title: 'Google Analytics',
})

const { proxy: proxy1, status: status1 } = useScriptGoogleAnalytics({
  id: 'G-TR58L0EF8P',
  dataLayerName: 'dataLayer1',
})

const { proxy: proxy2, status: status2 } = useScriptGoogleAnalytics({
  key: 'test',
  id: 'G-123456',
  dataLayerName: 'dataLayer2',
})

proxy1.gtag('event', 'page_view', {
  page_title: 'Google Analytics',
  page_location: 'https://harlanzw.com/third-parties/google-analytics',
  page_path: '/third-parties/google-analytics',
})

function triggerConversion() {
  proxy2.gtag('event', 'conversion')
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">
      GA Datalayers
    </h1>

    <div>
      <span class="font-medium">GA 1 Status:</span>
      <span class="ml-2 px-2 py-1 rounded text-sm" :class="status1 === 'loaded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'">
        {{ status1 }}
      </span>
    </div>

    <div>
      <span class="font-medium">GA 2 Status:</span>
      <span class="ml-2 px-2 py-1 rounded text-sm" :class="status2 === 'loaded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'">
        {{ status2 }}
      </span>
    </div>

    <UButton :disabled="status2 !== 'loaded'" @click="triggerConversion">
      Trigger Conversion (GA 2)
    </UButton>
  </div>
</template>

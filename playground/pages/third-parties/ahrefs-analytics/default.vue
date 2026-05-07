<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  script: [
    {
      'src': 'https://analytics.ahrefs.com/analytics.js',
      'data-key': 'demo-key',
      'async': true,
    },
  ],
})

function trackCustomEvent() {
  ;(window as any).AhrefsAnalytics?.sendEvent('demo-button-click', {
    props: { source: 'playground' },
  })
}
</script>

<template>
  <div>
    <UButton @click="trackCustomEvent">
      Send Custom Event
    </UButton>
  </div>
</template>

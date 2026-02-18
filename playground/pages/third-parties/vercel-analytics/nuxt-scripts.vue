<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Vercel Analytics',
})

const { proxy, status } = useScriptVercelAnalytics({
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const eventTracked = ref(false)

function trackEvent() {
  proxy.track('button_click', {
    button: 'demo',
    page: '/third-parties/vercel-analytics',
  })
  eventTracked.value = true
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <div v-if="eventTracked">
        Event tracked!
      </div>
    </ClientOnly>
    <button @click="trackEvent">
      Track Event
    </button>
  </div>
</template>

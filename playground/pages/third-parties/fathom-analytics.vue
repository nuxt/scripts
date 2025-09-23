<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Fathom Analytics',
})

// composables return the underlying api as a proxy object and the script state
const { status, proxy } = useScriptFathomAnalytics({
  site: 'BRDEJWKJ',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// Use proxy to track events - proxy handles script loading automatically
proxy.trackPageview({ url: '/fathom' })

const clicks = ref(0)
async function clickHandler() {
  clicks.value++
  proxy.trackEvent('ClickedButton', { _value: clicks.value })
}
</script>

<template>
  <div>
    <UButton @click="clickHandler">
      important conversion {{ clicks }}
    </UButton>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>

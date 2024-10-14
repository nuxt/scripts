<script lang="ts" setup>
import { ref, useHead, useScriptFathomAnalytics } from '#imports'

useHead({
  title: 'Fathom',
})

// composables return the underlying api as a proxy object and the script state
const { status, trackPageview, trackEvent } = useScriptFathomAnalytics({
  site: 'BRDEJWKJ',
})
// this will be triggered once the script is ready async
trackPageview({ url: '/fathom' })

const clicks = ref(0)
async function clickHandler() {
  clicks.value++
  trackEvent('ClickedButton', { _value: clicks.value })
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

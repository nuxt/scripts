<script lang="ts" setup>
import { ref, useHead, useScriptFathomAnalytics } from '#imports'

useHead({
  title: 'Fathom',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script, trackPageview, trackEvent } = useScriptFathomAnalytics({
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
        status: {{ $script.status.value }}
      </div>
    </ClientOnly>
  </div>
</template>

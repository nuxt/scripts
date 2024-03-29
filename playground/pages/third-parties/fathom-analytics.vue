<script lang="ts" setup>
import { ref, useHead, useScriptFathomAnalytics } from '#imports'

useHead({
  title: 'Fathom',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script, trackPageview, trackGoal } = useScriptFathomAnalytics({
  site: 'BRDEJWKJ',
  // load after 3 seconds
  trigger: new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, 2000)
  }),
})
// this will be triggered once the script is ready async
trackPageview({ url: '/fathom' })
// we can manually wait for the script to be ready (TODO error handling)
$script.then(() => {
  // eslint-disable-next-line no-console
  console.log('fathom is ready')
})
//
const clicks = ref(0)
async function trackEvent() {
  clicks.value++
  trackGoal('button', clicks.value)
}
</script>

<template>
  <div>
    <UButton @click="trackEvent">
      important conversion {{ clicks }}
    </UButton>
    <ClientOnly>
      <div>
        status: {{ $script.status }}
      </div>
    </ClientOnly>
  </div>
</template>

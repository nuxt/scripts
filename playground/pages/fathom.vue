<script lang="ts" setup>
import { ref, useFathomAnalytics } from '#imports'

// composables return the underlying api as a proxy object and a $script with the script state
const { $script, trackPageview } = useFathomAnalytics({
  site: 'BRDEJWKJ',
})
// we can manually wait for the script to be ready (TODO error handling)
$script.waitForLoad().then(() => {
  // eslint-disable-next-line no-console
  console.log('fathom is ready')
})
// this will be triggered once the script is ready async
trackPageview({ url: '/fathom' })

const clicks = ref(0)
const { trackGoal } = useFathomAnalytics()
async function trackEvent() {
  clicks.value++
  trackGoal('button', clicks.value)
}
</script>

<template>
  <div>
    <button @click="trackEvent">
      important conversion {{ clicks }}
    </button>
    <ClientOnly>
      <div>
        loaded: {{ $script.loaded }}
      </div>
    </ClientOnly>
  </div>
</template>

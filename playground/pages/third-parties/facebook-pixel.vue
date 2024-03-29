<script lang="ts" setup>
import { useHead, useScriptFacebookPixel } from '#imports'

useHead({
  title: 'Facebook Pixel',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script, fbq } = useScriptFacebookPixel({ id: '3925006' })
// this will be triggered once the script is ready async
function triggerEvent() {
  fbq('track', 'ViewContent', {
    value: 123,
    status: 'completed',
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status }}
      </div>
      <button @click="triggerEvent">
        Trigger Event
      </button>
    </ClientOnly>
  </div>
</template>

<script lang="ts" setup>
import { useHead, useScriptRedditPixel } from '#imports'

useHead({
  title: 'Reddit',
})

// composables return the underlying api as a proxy object and the script state
const { status, rdt } = useScriptRedditPixel({ id: 'YOUR_PIXEL_ID' })
// this will be triggered once the script is ready async
function triggerEvent() {
  rdt('track', 'PageVisit')
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <UButton @click="triggerEvent">
        Trigger Event
      </UButton>
    </ClientOnly>
  </div>
</template>

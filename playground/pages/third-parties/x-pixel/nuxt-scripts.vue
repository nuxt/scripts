<script lang="ts" setup>
import { useHead, useScriptXPixel } from '#imports'

useHead({
  title: 'X Pixel',
})

// composables return the underlying api as a proxy object and the script state
const { status, twq } = useScriptXPixel({ id: 'ol7lz' })
// this will be triggered once the script is ready async
function triggerEvent() {
  twq('event', 'tw-ol7lz-ol7mb', {
    value: 123,
  })
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

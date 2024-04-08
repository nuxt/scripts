<script lang="ts" setup>
import { useHead, useScriptXPixel } from '#imports'

useHead({
  title: 'X Pixel',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script, twq } = useScriptXPixel({ id: 'ol7lz' })
// this will be triggered once the script is ready async
function triggerEvent() {
  twq('event', ' tw-ol7lz-ol7mb', {
    value: 123,
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

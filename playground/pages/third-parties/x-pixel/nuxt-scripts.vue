<script lang="ts" setup>
import { useHead, useScriptXPixel } from '#imports'

useHead({
  title: 'X Pixel',
})

// composables return the underlying api as a proxy object and the script state
const { status, proxy } = useScriptXPixel({ id: 'ol7lz' })

function triggerEvent() {
  proxy.twq('event', 'tw-ol7lz-ol7mb', {
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

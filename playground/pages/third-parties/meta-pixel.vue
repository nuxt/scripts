<script lang="ts" setup>
import { useHead, useScriptMetaPixel } from '#imports'

useHead({
  title: 'Meta Pixel',
})

// composables return the underlying api as a proxy object and the script state
const { status, proxy } = useScriptMetaPixel({ id: '3925006' })

function triggerEvent() {
  proxy.fbq('track', 'ViewContent', {
    value: 123,
    status: 'completed',
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <button @click="triggerEvent">
        Trigger Event
      </button>
    </ClientOnly>
  </div>
</template>

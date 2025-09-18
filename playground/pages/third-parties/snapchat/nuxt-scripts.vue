<script lang="ts" setup>
import { useHead, useScriptSnapchatPixel } from '#imports'

useHead({
  title: 'Snapchat Pixel',
})

// composables return the underlying api as a proxy object and the script state
const { status, snaptr } = useScriptSnapchatPixel({ id: '2295cbcc-cb3f-4727-8c09-1133b742722c' })
// this will be triggered once the script is ready async

function triggerEvent() {
  snaptr('track', 'PAGE_VIEW')
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

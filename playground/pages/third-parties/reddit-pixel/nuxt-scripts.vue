<script lang="ts" setup>
import { useHead, useScriptRedditPixel } from '#imports'

useHead({
  title: 'Reddit',
})

// composables return the underlying api as a proxy object and the script state
const { status, proxy } = useScriptRedditPixel({ id: 'a2_ilz4u0kbdr3v' })

function triggerEvent() {
  proxy.rdt('track', 'PageVisit')
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

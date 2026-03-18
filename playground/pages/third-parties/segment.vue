<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Segment',
})

// composables return the underlying api as a proxy object and the script state
const { proxy, status } = useScriptSegment({
  writeKey: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// Use proxy to track page views
proxy.page('Segment')
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>

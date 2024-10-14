<script lang="ts" setup>
import { useHead, useScriptSegment } from '#imports'

useHead({
  title: 'Segment',
})

// composables return the underlying api as a proxy object and the script state
const { page, status } = useScriptSegment({ writeKey: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C' })

page('Segment')
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

<script lang="ts" setup>
import { useHead, useScriptSegment } from '#imports'

useHead({
  title: 'Segment',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script } = useScriptSegment({ writeKey: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C' })
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status }}
      </div>
    </ClientOnly>
  </div>
</template>

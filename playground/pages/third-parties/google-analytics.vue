<script lang="ts" setup>
import { useHead, useScriptGoogleAnalytics } from '#imports'

useHead({
  title: 'Google Analytics',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script } = useScriptGoogleAnalytics({ id: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C' })
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status.value }}
      </div>
    </ClientOnly>
  </div>
</template>

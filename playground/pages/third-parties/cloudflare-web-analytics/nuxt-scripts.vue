<script lang="ts" setup>
import { useHead, useScriptCloudflareWebAnalytics } from '#imports'

useHead({
  title: 'Cloudflare Web Analytics',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script } = useScriptCloudflareWebAnalytics({
  token: 'ade278253a19413c9bd923b079870902',
})
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

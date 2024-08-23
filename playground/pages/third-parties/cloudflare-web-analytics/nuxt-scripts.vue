<script lang="ts" setup>
import { useHead, useScriptCloudflareWebAnalytics } from '#imports'

useHead({
  title: 'Cloudflare Web Analytics',
})

// composables return the underlying api as a proxy object and the script state
const { status } = useScriptCloudflareWebAnalytics({
  token: 'ade278253a19413c9bd923b079870902',
})
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

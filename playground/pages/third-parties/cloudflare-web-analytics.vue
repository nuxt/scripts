<script lang="ts" setup>
import { useHead, useScriptCloudflareWebAnalytics } from '#imports'

useHead({
  title: 'Cloudflare Web Analytics',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script } = useScriptCloudflareWebAnalytics({
  token: '12ee46bf598b45c2868bbc07a3073f58',
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

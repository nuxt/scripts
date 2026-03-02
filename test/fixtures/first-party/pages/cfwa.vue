<script lang="ts" setup>
import { useHead, useScriptCloudflareWebAnalytics } from '#imports'

useHead({ title: 'Cloudflare WA - First Party' })
const { status } = useScriptCloudflareWebAnalytics({ token: 'test-token' })
</script>

<template>
  <div>
    <h1>Cloudflare Web Analytics First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>

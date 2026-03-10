<script lang="ts" setup>
import { useHead, useScriptCloudflareWebAnalytics } from '#imports'

useHead({ title: 'Cloudflare WA - First Party' })
const { status } = useScriptCloudflareWebAnalytics({ token: 'ade278253a19413c9bd923b079870902' })
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

<script lang="ts" setup>
import { useHead, useScriptPostHog } from '#imports'

useHead({ title: 'PostHog - First Party' })
const { status } = useScriptPostHog({
  apiKey: 'phc_test',
  region: 'us',
  config: {
    autocapture: false,
    capture_pageview: true,
  },
})
</script>

<template>
  <div>
    <h1>PostHog First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>

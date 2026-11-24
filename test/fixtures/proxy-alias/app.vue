<script setup lang="ts">
// The module auto-injects Plausible's `endpoint` into public runtime config.
// Render it so the e2e test can assert it was rewritten to the aliased path.
const scripts = useRuntimeConfig().public.scripts as Record<string, any>
const endpoint = scripts?.plausibleAnalytics?.endpoint ?? 'NO_ENDPOINT'
const posthogHost = scripts?.posthog?.apiHost ?? 'DIRECT_POSTHOG'
</script>

<template>
  <div id="plausible-endpoint">{{ endpoint }}</div>
  <div id="posthog-host">{{ posthogHost }}</div>
</template>

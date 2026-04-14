<script lang="ts" setup>
if (import.meta.dev) {
  console.warn(
    '[nuxt-scripts] <ScriptGoogleMapsPinElement> was removed in v1. '
    + 'Use the #content slot on <ScriptGoogleMapsMarker> instead. '
    + 'See https://scripts.nuxt.com/docs/migration-guide/v0-to-v1',
  )
}
</script>

<template>
  <slot />
</template>

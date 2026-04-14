<script lang="ts" setup>
if (import.meta.dev) {
  console.warn(
    '[nuxt-scripts] <ScriptGoogleMapsAdvancedMarkerElement> was renamed to <ScriptGoogleMapsMarker> in v1. '
    + 'See https://scripts.nuxt.com/docs/migration-guide/v0-to-v1',
  )
}
</script>

<template>
  <ScriptGoogleMapsMarker v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </ScriptGoogleMapsMarker>
</template>

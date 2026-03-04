<script lang="ts" setup>
import { useScript } from '#imports'

// This page calls useScript() directly while registry scripts are also configured.
// Regression test: when the plugin provides $scripts via Nuxt's provide mechanism,
// useScript() must not try to reassign the getter-only $scripts property.
const { status } = useScript('/myScript.js', {
  trigger: 'client',
})
</script>

<template>
  <div>
    <h1>useScript with Registry</h1>
    <div id="status">
      {{ status }}
    </div>
  </div>
</template>

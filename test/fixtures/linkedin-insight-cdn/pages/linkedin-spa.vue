<script lang="ts" setup>
// Overrides the parent layer's pages/linkedin-spa.vue with `bundle: false`.
import { useHead, useScriptLinkedInInsight } from '#imports'

useHead({ title: 'LinkedIn Insight Tag - SPA Target' })

useScriptLinkedInInsight({
  scriptOptions: { bundle: false },
})
</script>

<template>
  <div>
    <h1>SPA Target</h1>
    <p id="spa-marker">
      Navigated via client-side routing.
    </p>
  </div>
</template>

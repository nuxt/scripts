<script lang="ts" setup>
import { useHead, useScriptLinkedInInsight } from '#imports'

useHead({ title: 'LinkedIn Insight Tag - SPA Target' })

useScriptLinkedInInsight()
</script>

<template>
  <div>
    <h1>SPA Target</h1>
    <p id="spa-marker">
      Navigated via client-side routing.
    </p>
  </div>
</template>

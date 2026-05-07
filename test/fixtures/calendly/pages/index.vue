<script lang="ts" setup>
// Empty by design — keeps the index page off the calendly composable
// so Vite doesn't try to parse `#imports` before Nuxt prepare has run.
import { useHead } from '#imports'

useHead({ title: 'Empty Index' })
</script>

<template>
  <div>
    <p id="index-marker">
      Empty index (no Calendly composable).
    </p>
  </div>
</template>

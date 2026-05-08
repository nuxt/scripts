<script lang="ts" setup>
// Empty index used as the SPA-navigation target. Has no Ahrefs composable
// so beacon counts on this page reflect only the in-script auto-tracker.
import { useHead } from '#imports'

useHead({ title: 'Empty Index' })
</script>

<template>
  <div>
    <p id="index-marker">
      Empty index (no Ahrefs composable).
    </p>
  </div>
</template>

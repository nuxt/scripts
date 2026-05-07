<script lang="ts" setup>
// Empty by design — used by the no-SPA negative test as a navigation
// target that won't fire any LinkedIn beacons of its own.
import { useHead } from '#imports'

useHead({ title: 'Empty Index' })
</script>

<template>
  <div>
    <p id="index-marker">
      Empty index (no LinkedIn composable).
    </p>
  </div>
</template>

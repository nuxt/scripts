<script lang="ts" setup>
import { useHead, useScriptSpeedCurve } from '#imports'

useHead({ title: 'SpeedCurve No SPA — Page C' })

const { status } = useScriptSpeedCurve({
  // requires a valid tenant id
  id: '4328391745',
  spaMode: false,
})
</script>

<template>
  <div class="space-y-4">
    <div class="text-sm text-gray-500">
      <strong>No SPA / Page C</strong> — no <code>startSoftNavigation</code> was called when you arrived here.
    </div>
    <div class="text-sm">
      status: <strong>{{ status }}</strong>
    </div>
    <NuxtLink to="/third-parties/speed-curve/no-spa/a">
      <UButton color="primary">Go to Page A →</UButton>
    </NuxtLink>
  </div>
</template>

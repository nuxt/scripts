<script lang="ts" setup>
import { useHead, useScriptSpeedCurve } from '#imports'

useHead({ title: 'SpeedCurve No SPA — Page A' })

const { status } = useScriptSpeedCurve({
  // requires a valid tenant id
  id: '4328391745',
  spaMode: false,
})
</script>

<template>
  <div class="space-y-4">
    <div class="text-sm text-gray-500">
      <strong>No SPA / Page A</strong> — <code>spaMode: false</code><br>
      No router hooks installed. LUX only tracks the initial hard load. Navigating between pages
      produces no soft-navigation beacons — each navigation is a full page reload from LUX's perspective.
    </div>
    <div class="text-sm">
      status: <strong>{{ status }}</strong>
    </div>
    <NuxtLink to="/third-parties/speed-curve/no-spa/b">
      <UButton color="primary">Go to Page B →</UButton>
    </NuxtLink>
  </div>
</template>

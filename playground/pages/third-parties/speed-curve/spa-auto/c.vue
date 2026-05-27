<script lang="ts" setup>
import { useHead, useScriptSpeedCurve } from '#imports'

useHead({ title: 'SpeedCurve SPA Auto — Page C' })

const { status } = useScriptSpeedCurve({
  // requires a valid tenant id
  id: '4328391745',
  spaMode: true,
  autoTrackSpaNavigations: true,
})

const label = ref('')
onMounted(() => {
  label.value = (window as any).LUX?.label ?? ''
})
</script>

<template>
  <div class="space-y-4">
    <div class="text-sm text-gray-500">
      <strong>SPA Auto / Page C</strong> — beacon for Page B was sent when you arrived here.
      Navigate back to Page A to complete the loop and send the beacon for this page.
    </div>
    <div class="text-sm space-y-1">
      <div>status: <strong>{{ status }}</strong></div>
      <div>LUX.label: <strong>{{ label || '(empty)' }}</strong></div>
    </div>
    <NuxtLink to="/third-parties/speed-curve/spa-auto/a">
      <UButton color="primary">Go to Page A →</UButton>
    </NuxtLink>
  </div>
</template>

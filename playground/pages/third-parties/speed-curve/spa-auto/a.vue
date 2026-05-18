<script lang="ts" setup>
import { useHead, useScriptSpeedCurve } from '#imports'

useHead({ title: 'SpeedCurve SPA Auto — Page A' })

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
      <strong>SPA Auto / Page A</strong> — <code>spaMode: true, autoTrackSpaNavigations: true</code><br>
      LUX fires <code>startSoftNavigation</code> + <code>markLoadTime</code> automatically on every route change.
      The beacon for this page fires when you navigate away.
    </div>
    <div class="text-sm space-y-1">
      <div>status: <strong>{{ status }}</strong></div>
      <div>LUX.label: <strong>{{ label || '(empty)' }}</strong></div>
    </div>
    <NuxtLink to="/third-parties/speed-curve/spa-auto/b">
      <UButton color="primary">Go to Page B →</UButton>
    </NuxtLink>
  </div>
</template>

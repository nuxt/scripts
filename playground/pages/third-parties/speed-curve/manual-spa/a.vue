<script lang="ts" setup>
import { useHead, useScriptSpeedCurve } from '#imports'

useHead({ title: 'SpeedCurve Manual SPA — Page A' })

const { status, proxy } = useScriptSpeedCurve({
  // requires a valid tenant id
  id: '4328391745',
  spaMode: true,
  autoTrackSpaNavigations: false,
})

function startSoftNav() {
  proxy.LUX.startSoftNavigation()
}
function markLoad() {
  proxy.LUX.markLoadTime()
}
function addData() {
  proxy.LUX.addData('page', 'A')
}
</script>

<template>
  <div class="space-y-4">
    <div class="text-sm text-gray-500">
      <strong>Manual SPA / Page A</strong> — <code>spaMode: true, autoTrackSpaNavigations: false</code><br>
      Router hooks are wired but auto-tracking is disabled. Call LUX methods yourself to control when beacons fire.
    </div>
    <div class="text-sm">
      status: <strong>{{ status }}</strong>
    </div>
    <div class="flex gap-2 flex-wrap">
      <UButton @click="startSoftNav">startSoftNavigation()</UButton>
      <UButton @click="markLoad">markLoadTime()</UButton>
      <UButton @click="addData">addData('page', 'A')</UButton>
    </div>
    <NuxtLink to="/third-parties/speed-curve/manual-spa/b">
      <UButton color="primary">Go to Page B →</UButton>
    </NuxtLink>
  </div>
</template>

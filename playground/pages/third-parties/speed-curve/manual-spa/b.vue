<script lang="ts" setup>
import { useHead, useScriptSpeedCurve } from '#imports'

useHead({ title: 'SpeedCurve Manual SPA — Page B' })

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
  proxy.LUX.addData('page', 'B')
}
</script>

<template>
  <div class="space-y-4">
    <div class="text-sm text-gray-500">
      <strong>Manual SPA / Page B</strong> — no automatic beacon was triggered on arrival.
      Call the LUX methods yourself to track this page view.
    </div>
    <div class="text-sm">
      status: <strong>{{ status }}</strong>
    </div>
    <div class="flex gap-2 flex-wrap">
      <UButton @click="startSoftNav">startSoftNavigation()</UButton>
      <UButton @click="markLoad">markLoadTime()</UButton>
      <UButton @click="addData">addData('page', 'B')</UButton>
    </div>
    <NuxtLink to="/third-parties/speed-curve/manual-spa/c">
      <UButton color="primary">Go to Page C →</UButton>
    </NuxtLink>
  </div>
</template>

<script lang="ts" setup>
import { useHead, useScriptSpeedCurve } from '#imports'

useHead({
  title: 'SpeedCurve LUX',
})

const { status, proxy } = useScriptSpeedCurve({
  id: 'YOUR_SPEEDCURVE_ID',
  spaMode: true,
  autoTrackSpaNavigations: true,
})

function setLabel() {
  proxy.LUX.label = 'manual-label-' + Date.now()
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>status: {{ status }}</div>
      <div class="flex gap-2 mt-4">
        <UButton @click="setLabel">
          Set LUX Label
        </UButton>
      </div>
    </ClientOnly>
  </div>
</template>

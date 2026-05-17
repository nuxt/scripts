<script setup lang="ts">
if (import.meta.client) {
  window._luxCalls = []
  const record = (method: string) => (...args: unknown[]) => {
    window._luxCalls!.push({ method, args })
  }
  window.LUX = {
    snippetVersion: '2.0.0',
    ac: [],
    label: 'original-label',
    startSoftNavigation: record('startSoftNavigation'),
    markLoadTime: record('markLoadTime'),
    addData: record('addData'),
  } as any
}

const { status } = useScriptSpeedCurve({
  id: '123456789',
  spaMode: true,
  autoTrackSpaNavigations: true,
  labelFor: false,
})
</script>

<template>
  <div>
    <div id="status">{{ status }}</div>
    <NuxtLink id="nav-destination" to="/tpc/speedcurve-label-off/destination">destination</NuxtLink>
  </div>
</template>

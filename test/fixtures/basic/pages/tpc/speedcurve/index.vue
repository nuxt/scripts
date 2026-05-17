<script setup lang="ts">
// Install LUX spy BEFORE composable runs.
// The primer does `window.LUX = window.LUX || {}` — pre-existing object is preserved.
if (import.meta.client && !window._luxCalls) {
  window._luxCalls = []
  const record = (method: string) => (...args: unknown[]) => {
    window._luxCalls!.push({ method, args })
  }
  window.LUX = {
    snippetVersion: '2.0.0',
    ac: [],
    label: '',
    startSoftNavigation: record('startSoftNavigation'),
    markLoadTime: record('markLoadTime'),
    addData: record('addData'),
  } as any
}

// Block navigation to /tpc/speedcurve/blocked (for canceled-nav test)
const router = useRouter()
router.beforeEach((to) => {
  if (to.path.endsWith('/blocked')) return false
})

const { status } = useScriptSpeedCurve({
  id: '123456789',
  spaMode: true,
  autoTrackSpaNavigations: true,
})
</script>

<template>
  <div>
    <div id="status">{{ status }}</div>
    <NuxtLink id="nav-destination" to="/tpc/speedcurve/destination">destination</NuxtLink>
    <NuxtLink id="nav-blocked" to="/tpc/speedcurve/blocked">blocked (guard blocks this)</NuxtLink>
  </div>
</template>

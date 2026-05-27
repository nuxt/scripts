<script setup lang="ts">
// Direct exercise of the codepaths that broke under @unhead/vue v3's stricter
// types. Avoids registry components that surface unrelated pre-existing typing
// issues; we want this fixture to be a clean v3 regression gate.

// 1) useScript: hits the `head.hooks!` path and the `injectHead()` cast
const { status } = useScript({
  src: 'https://example.com/regression.js',
  key: 'regression-probe',
}, {
  trigger: 'manual',
})

// 2) useHead with a runtime-determined resource-hint rel (the original Daniel
//    error from PR #795). Lifted out of `.filter()` so contextual typing holds.
const eager = true
if (import.meta.server) {
  useHead({
    link: [
      {
        rel: eager ? 'preconnect' : 'dns-prefetch',
        href: 'https://example.com',
      },
    ],
  })
}

// 3) Partytown quick-path inside useScript: covers the
//    `type: 'text/partytown' as 'text/javascript'` cast.
useScript(
  { src: 'https://example.com/partytown.js', key: 'partytown-probe' },
  { partytown: true, trigger: 'manual' },
)
</script>

<template>
  <div>
    <div id="probe-status">{{ status }}</div>
  </div>
</template>

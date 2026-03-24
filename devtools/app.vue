<script setup lang="ts">
import { computed } from 'vue'
import { initRegistry, version } from './composables/state'
import './composables/rpc'

await loadShiki()
await initRegistry()

const route = useRoute()
const currentTab = computed(() => {
  const path = route.path
  if (path.startsWith('/first-party'))
    return 'first-party'
  if (path.startsWith('/registry'))
    return 'registry'
  if (path.startsWith('/docs'))
    return 'docs'
  return 'scripts'
})

const navItems = [
  { value: 'scripts', to: '/', icon: 'carbon:script', label: 'Scripts', devOnly: false },
  { value: 'first-party', to: '/first-party', icon: 'carbon:security', label: 'First-Party Mode', devOnly: true },
  { value: 'registry', to: '/registry', icon: 'carbon:catalog', label: 'Registry', devOnly: true },
  { value: 'docs', to: '/docs', icon: 'carbon:book', label: 'Docs', devOnly: false },
]

const runtimeVersion = computed(() => version.value)
</script>

<template>
  <DevtoolsLayout
    :active-tab="currentTab"
    title="Scripts"
    icon="carbon:script"
    :version="runtimeVersion"
    :nav-items="navItems"
    github-url="https://github.com/nuxt/scripts"
    :loading="false"
  >
    <NuxtPage />
  </DevtoolsLayout>
</template>

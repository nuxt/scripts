<script setup lang="ts">
import { useRegistryScript } from '#nuxt-scripts/utils'

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

type FixtureApi = {
  count: number
  increment: () => void
}

declare global {
  interface Window {
    fixtureApi?: FixtureApi
  }
}

const proxyResult = ref('pending')
const { load, proxy } = useScript<FixtureApi>('/fixture-api.js', {
  trigger: 'manual',
  use: () => window.fixtureApi as FixtureApi,
})
const retainedProxy = proxy

type FixtureModule = {
  ping: () => string
}

const moduleResult = ref('pending')
const moduleRuntime = ref('pending')
const moduleIdentity = ref('pending')
const moduleInitCount = ref(0)
const moduleApi: FixtureModule = {
  ping: () => 'passed',
}
const useFixtureModule = () => useRegistryScript<FixtureModule>('fixture-module', () => ({
  scriptMode: 'npm',
  clientInit: async () => {
    moduleInitCount.value++
    return moduleApi
  },
  scriptOptions: {
    trigger: 'manual',
    use: () => moduleApi,
  },
}), {
  scriptOptions: { trigger: 'manual' },
})
const moduleScript = useFixtureModule()
const duplicateModuleScript = useFixtureModule()

onMounted(() => {
  retainedProxy.increment()
  load()
    .then(() => {
      retainedProxy.increment()
      proxyResult.value = window.fixtureApi?.count === 2 ? 'passed' : `failed:${window.fixtureApi?.count}`
    })
    .catch((error: unknown) => {
      proxyResult.value = error instanceof Error ? error.message : String(error)
    })
  moduleRuntime.value = typeof moduleScript.remove === 'function' ? 'native' : 'fallback'
  moduleIdentity.value = String(moduleScript.script === duplicateModuleScript.script)
  Promise.all([moduleScript.load(), duplicateModuleScript.load()])
    .then(() => {
      const result = moduleScript.proxy.ping()
      moduleResult.value = result === 'passed' && moduleInitCount.value === 1
        ? 'passed'
        : `failed:${result}:${moduleInitCount.value}`
    })
    .catch((error: unknown) => {
      moduleResult.value = error instanceof Error ? error.message : String(error)
    })
})
</script>

<template>
  <div>
    <div id="probe-status">{{ status }}</div>
    <div id="proxy-result">{{ proxyResult }}</div>
    <div id="module-result">{{ moduleResult }}</div>
    <div id="module-runtime">{{ moduleRuntime }}</div>
    <div id="module-identity">{{ moduleIdentity }}</div>
    <div id="module-init-count">{{ moduleInitCount }}</div>
  </div>
</template>

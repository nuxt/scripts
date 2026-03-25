import { defineNuxtPlugin, useNuxtApp, useRuntimeConfig } from 'nuxt/app'

/**
 * Dev-only client plugin that bridges script state to the standalone devtools API.
 * When `standaloneDevtools` is enabled, this plugin listens for `scripts:updated`
 * and POSTs a serializable snapshot of script state to `/__nuxt-scripts-api/state`.
 * Also syncs the current route path so standalone devtools can show which page the user is on.
 */
export default defineNuxtPlugin(() => {
  const nuxtApp = useNuxtApp()
  const config = useRuntimeConfig()
  const version = (config.public['nuxt-scripts'] as any)?.version
  const firstPartyData = (config.public['nuxt-scripts-devtools'] as any) || null

  let lastScripts: Record<string, any> = {}

  function pushState(scripts?: Record<string, any>) {
    if (scripts)
      lastScripts = scripts
    const route = nuxtApp.$router?.currentRoute?.value
    // Don't report the devtools UI route as the user's current page
    if (route?.path?.startsWith('/__nuxt-scripts'))
      return
    fetch('/__nuxt-scripts-api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scripts: serializeScripts(lastScripts),
        version,
        firstPartyData,
        route: route ? { path: route.path, fullPath: route.fullPath, query: route.query } : null,
      }),
    }).catch(() => {
      // Silently ignore, the standalone API may not be accessible
    })
  }

  nuxtApp.hooks.hook('scripts:updated' as any, (ctx: { scripts: Record<string, any> }) => {
    pushState(ctx.scripts)
  })

  // Sync route changes
  nuxtApp.$router?.afterEach(() => {
    pushState()
  })

  // Push initial state on load
  pushState((nuxtApp as any)._scripts || {})
})

function serializeScripts(scripts: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, script] of Object.entries(scripts)) {
    result[key] = {
      src: script.src,
      key: script.key,
      registryKey: script.registryKey,
      registryMeta: script.registryMeta,
      loadedFrom: script.loadedFrom && script.loadedFrom !== 'unknown' ? script.loadedFrom : undefined,
      events: script.events,
      networkRequests: script.networkRequests,
      // Serialize $script status as a plain string (methods won't transfer)
      $script: script.$script
        ? { status: typeof script.$script.status === 'object' ? script.$script.status.value : script.$script.status }
        : { status: 'unknown' },
    }
  }
  return result
}

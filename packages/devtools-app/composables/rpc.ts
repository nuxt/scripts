import type { NuxtDevtoolsClient } from '@nuxt/devtools-kit/types'

import type { $Fetch } from 'nitropack/types'
import type { Ref } from 'vue'
import { onDevtoolsClientConnected } from '@nuxt/devtools-kit/iframe-client'
import { ofetch } from 'ofetch'
import { ref, watch, watchEffect } from 'vue'
import { firstPartyData, isConnected, path, query, refreshSources, standaloneUrl, syncScripts, version } from './state'

export const appFetch: Ref<$Fetch | undefined> = ref()
export const devtools: Ref<NuxtDevtoolsClient | undefined> = ref()
export const colorMode: Ref<'dark' | 'light'> = ref('dark')

export interface DevtoolsConnectionOptions {
  onConnected?: (client: any) => void | (() => void)
  onRouteChange?: (route: any) => void
}

const STANDALONE_API_PATH = '/__nuxt-scripts-api/state'
const STANDALONE_POLL_INTERVAL = 2000

/**
 * Initialize the base devtools connection.
 * Call this in your module's devtools client setup.
 *
 * Supports two modes:
 * - **Embedded**: running inside Nuxt DevTools iframe (automatic)
 * - **Standalone**: running directly in a browser tab with a manual dev server URL
 */
export function useDevtoolsConnection(options: DevtoolsConnectionOptions = {}): () => void {
  const inIframe = window.parent !== window
  let disposed = false
  const connectionCleanups: Array<() => void> = []

  const cleanupConnection = () => {
    connectionCleanups.splice(0).forEach(cleanup => cleanup())
    devtools.value = undefined
  }

  // Embedded mode: connect via devtools-kit iframe client
  let stopClientConnection = () => {}
  if (inIframe) {
    stopClientConnection = onDevtoolsClientConnected((client) => {
      if (disposed)
        return
      cleanupConnection()
      isConnected.value = true
      // @ts-expect-error untyped
      appFetch.value = client.host.app.$fetch
      connectionCleanups.push(watchEffect(() => {
        colorMode.value = client.host.app.colorMode.value
      }))
      devtools.value = client.devtools
      const cleanupConnected = options.onConnected?.(client)
      if (cleanupConnected)
        connectionCleanups.push(cleanupConnected)

      if (options.onRouteChange) {
        const $route = client.host.nuxt.vueApp.config.globalProperties?.$route
        options.onRouteChange($route)
        const removeAfterEach = client.host.nuxt.$router.afterEach((route: any) => {
          options.onRouteChange!(route)
        })
        connectionCleanups.push(removeAfterEach)
      }
      // @ts-expect-error app:unmount exists at runtime but is not in RuntimeNuxtHooks
      connectionCleanups.push(client.host.nuxt.hook('app:unmount', cleanupConnection))
    }) || (() => {})
  }

  // Standalone mode: create appFetch from manually entered URL and poll for state
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let pollController: AbortController | undefined

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = undefined
    }
    pollController?.abort()
    pollController = undefined
  }

  const poll = async (url: string) => {
    // A slow/unreachable app must not accumulate overlapping interval requests.
    if (pollController)
      return
    const controller = new AbortController()
    pollController = controller
    try {
      await pollStandaloneState(url, controller.signal)
    }
    finally {
      if (pollController === controller)
        pollController = undefined
    }
  }

  const stopStandaloneWatch = watch(() => standaloneUrl.value, (url) => {
    // Clean up previous polling
    stopPolling()

    if (url && !isConnected.value) {
      appFetch.value = ofetch.create({ baseURL: url }) as unknown as $Fetch
      // Use system color scheme preference
      colorMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      refreshSources()
      // Start polling the standalone API for script state
      void poll(url)
      pollTimer = setInterval(() => void poll(url), STANDALONE_POLL_INTERVAL)
    }
  }, { immediate: true })

  return () => {
    if (disposed)
      return
    disposed = true
    stopPolling()
    stopStandaloneWatch()
    stopClientConnection()
    cleanupConnection()
    appFetch.value = undefined
    isConnected.value = false
  }
}

async function pollStandaloneState(baseUrl: string, signal: AbortSignal) {
  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), 3000)
  const onAbort = () => timeoutController.abort()
  signal.addEventListener('abort', onAbort, { once: true })
  try {
    const res = await fetch(`${baseUrl}${STANDALONE_API_PATH}`, {
      signal: timeoutController.signal,
    })
    if (!res.ok)
      return
    const data = await res.json()
    if (data.version)
      version.value = data.version
    if (data.firstPartyData)
      firstPartyData.value = data.firstPartyData
    if (data.scripts)
      syncScripts(data.scripts)
    // Sync the current page path from the Nuxt app (ignore devtools internal routes)
    if (data.route?.path && !data.route.path.startsWith('/__nuxt-scripts')) {
      path.value = data.route.path
      query.value = data.route.query
    }
  }
  catch {
    // Standalone API not available or not enabled, silently ignore
  }
  finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', onAbort)
  }
}

const disposeConnection = useDevtoolsConnection({
  onConnected: (client) => {
    const stopScriptsHook = client.host.nuxt.hooks.hook('scripts:updated', (ctx: any) => {
      syncScripts(ctx.scripts)
    })
    version.value = client.host.nuxt.$config.public['nuxt-scripts'].version
    firstPartyData.value = client.host.nuxt.$config.public['nuxt-scripts-devtools'] || null
    syncScripts(client.host.nuxt._scripts || {})
    return stopScriptsHook
  },
})

function disposeModuleConnection() {
  window.removeEventListener('beforeunload', disposeModuleConnection)
  disposeConnection()
}

window.addEventListener('beforeunload', disposeModuleConnection, { once: true })
if (import.meta.hot)
  import.meta.hot.dispose(disposeModuleConnection)

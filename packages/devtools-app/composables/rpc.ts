import type { NuxtDevtoolsClient } from '@nuxt/devtools-kit/types'

import type { $Fetch } from 'nitropack/types'
import type { Ref } from 'vue'
import { onDevtoolsClientConnected } from '@nuxt/devtools-kit/iframe-client'
import { ofetch } from 'ofetch'
import { onScopeDispose, ref, watch, watchEffect } from 'vue'
import { firstPartyData, isConnected, path, query, refreshSources, standaloneUrl, syncScripts, version } from './state'

export const appFetch: Ref<$Fetch | undefined> = ref()
export const devtools: Ref<NuxtDevtoolsClient | undefined> = ref()
export const colorMode: Ref<'dark' | 'light'> = ref('dark')

export interface DevtoolsConnectionOptions {
  onConnected?: (client: any) => void
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
export function useDevtoolsConnection(options: DevtoolsConnectionOptions = {}): void {
  const inIframe = window.parent !== window

  // Embedded mode: connect via devtools-kit iframe client
  if (inIframe) {
    onDevtoolsClientConnected(async (client) => {
      isConnected.value = true
      // @ts-expect-error untyped
      appFetch.value = client.host.app.$fetch
      watchEffect(() => {
        colorMode.value = client.host.app.colorMode.value
      })
      devtools.value = client.devtools
      options.onConnected?.(client)

      if (options.onRouteChange) {
        const $route = client.host.nuxt.vueApp.config.globalProperties?.$route
        options.onRouteChange($route)
        const removeAfterEach = client.host.nuxt.$router.afterEach((route: any) => {
          options.onRouteChange!(route)
        })
        // Clean up when devtools client disconnects
        // @ts-expect-error app:unmount exists at runtime but is not in RuntimeNuxtHooks
        client.host.nuxt.hook('app:unmount', removeAfterEach)
      }
    })
  }

  // Standalone mode: create appFetch from manually entered URL and poll for state
  let pollTimer: ReturnType<typeof setInterval> | undefined

  watch(() => standaloneUrl.value, (url) => {
    // Clean up previous polling
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = undefined
    }

    if (url && !isConnected.value) {
      appFetch.value = ofetch.create({ baseURL: url }) as unknown as $Fetch
      // Use system color scheme preference
      colorMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      refreshSources()
      // Start polling the standalone API for script state
      pollStandaloneState(url)
      pollTimer = setInterval(pollStandaloneState, STANDALONE_POLL_INTERVAL, url)
    }
  }, { immediate: true })

  onScopeDispose(() => {
    if (pollTimer) {
      clearInterval(pollTimer)
    }
  })
}

async function pollStandaloneState(baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}${STANDALONE_API_PATH}`, {
      signal: AbortSignal.timeout(3000),
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
}

useDevtoolsConnection({
  onConnected: (client) => {
    client.host.nuxt.hooks.hook('scripts:updated', (ctx: any) => {
      syncScripts(ctx.scripts)
    })
    version.value = client.host.nuxt.$config.public['nuxt-scripts'].version
    firstPartyData.value = client.host.nuxt.$config.public['nuxt-scripts-devtools'] || null
    syncScripts(client.host.nuxt._scripts || {})
  },
})

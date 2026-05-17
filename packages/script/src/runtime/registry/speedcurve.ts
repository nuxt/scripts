import type { LuxGlobal, UserConfig } from '@speedcurve/lux'
import type { RouteLocationNormalized } from 'vue-router'
import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import luxSnippetSource from '@speedcurve/lux/dist/lux-snippet.js?raw'
import { useHead, useNuxtApp, useRouter } from 'nuxt/app'
import { useRegistryScript } from '../utils'
import { afterNextPaint } from '../utils/after-next-paint'
import { SpeedCurveOptions } from './schemas'

export { SpeedCurveOptions }

export interface SpeedCurveApi {
  LUX: LuxGlobal
}

declare global {
  interface Window {
    LUX?: LuxGlobal
    LUX_ae?: ErrorEvent[]
    LUX_al?: PerformanceEntry[]
    __speedcurveLuxWired?: boolean
    _luxCalls?: Array<{ method: string, args: unknown[] }>
  }
}

export type SpeedCurveInput = RegistryScriptInput<typeof SpeedCurveOptions> & {
  /**
   * Derive a page label for each SPA navigation.
   * Defaults to `String(to.name ?? to.path)`.
   * Set to `false` to disable labeling.
   */
  labelFor?: ((to: RouteLocationNormalized) => string) | false
}

// LUX UserConfig keys that map 1:1 to our schema (autoTrackSpaNavigations is composable-only).
const LUX_USER_CONFIG_KEYS: (keyof UserConfig)[] = [
  'spaMode',
  'auto',
  'label',
  'samplerate',
  'sendBeaconOnPageHidden',
  'trackErrors',
  'maxErrors',
  'minMeasureTime',
  'maxMeasureTime',
  'newBeaconOnPageShow',
  'trackHiddenPages',
  'cookieDomain',
]

export function useScriptSpeedCurve<T extends SpeedCurveApi>(_options?: SpeedCurveInput): UseScriptContext<T> {
  return useRegistryScript<T, typeof SpeedCurveOptions>('speedcurve', options => ({
    scriptInput: {
      src: `https://cdn.speedcurve.com/js/lux.js?id=${options.id}`,
      crossorigin: 'anonymous',
    },
    schema: import.meta.dev ? SpeedCurveOptions : undefined,
    scriptOptions: {
      trigger: 'client',
      use: () => ({ LUX: window.LUX! } as T),
      beforeInit: () => {
        useHead({
          script: [{
            key: 'speedcurve-lux-primer',
            tagPosition: 'head',
            tagPriority: 'critical',
            innerHTML: luxSnippetSource,
          }],
        })
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          applyConfig(options)
          if (options.spaMode && options.autoTrackSpaNavigations !== false)
            installAutoTracker(_options)
        },
  }), _options) as UseScriptContext<T>
}

export function applyConfig(options: SpeedCurveInput): void {
  const lux = window.LUX as Record<string, unknown> | undefined
  if (!lux)
    return
  for (const k of LUX_USER_CONFIG_KEYS) {
    const v = (options as Record<string, unknown>)[k as string]
    if (v !== undefined)
      lux[k as string] = v
  }
}

export function installAutoTracker(options?: SpeedCurveInput): void {
  if (window.__speedcurveLuxWired)
    return
  window.__speedcurveLuxWired = true

  const router = useRouter()
  const nuxt = useNuxtApp()

  // For SPA-only apps (no SSR), the first beforeEach fires for the initial
  // client-side render — not a user navigation. Skip startSoftNavigation.
  let pendingInitial = nuxt.payload?.serverRendered === false

  const labelFor = options?.labelFor === false
    ? null
    : (options?.labelFor ?? ((to: RouteLocationNormalized) => String(to.name ?? to.path)))

  router.beforeEach((to) => {
    const lux = window.LUX
    if (!lux)
      return
    if (pendingInitial) {
      pendingInitial = false
      if (labelFor)
        lux.label = labelFor(to)
      return
    }
    lux.startSoftNavigation()
    if (labelFor)
      lux.label = labelFor(to)
  })

  // If a guard cancels navigation, seal the phantom beacon with a filterable tag.
  router.afterEach((_to, _from, failure) => {
    if (!failure)
      return
    const lux = window.LUX
    if (!lux)
      return
    lux.markLoadTime()
    lux.addData('luxNavFailed', '1')
  })

  nuxt.hook('page:finish', () => {
    afterNextPaint(() => window.LUX?.markLoadTime())
  })
}

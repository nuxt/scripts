import type { LuxGlobal, UserConfig } from '@speedcurve/lux'
import type { RouteLocationNormalized } from 'vue-router'
import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useHead, useNuxtApp, useRouter } from 'nuxt/app'
// @ts-expect-error virtual emitted by the Nuxt module
import { speedcurveLuxSnippet } from '#build/nuxt-scripts-snippets'
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
  }
}

export type SpeedCurveInput = Omit<RegistryScriptInput<typeof SpeedCurveOptions>, 'label'> & Omit<UserConfig, 'label'> & {
  label?: string | ((to: RouteLocationNormalized) => string | false) | false
}

// Derived from the schema: all schema keys except the composable-only ones.
const LUX_USER_CONFIG_KEYS = Object.keys(SpeedCurveOptions.entries).filter(
  k => k !== 'id' && k !== 'autoTrackSpaNavigations' && k !== 'spaMode',
) as (keyof UserConfig)[]

let luxWired = false

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
        if (!speedcurveLuxSnippet)
          return

        useHead({
          script: [{
            key: 'speedcurve-lux-primer',
            tagPosition: 'head',
            tagPriority: 'critical',
            innerHTML: speedcurveLuxSnippet,
          }],
        })
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const input = options as unknown as SpeedCurveInput
          applyConfig(input)
          if (options.spaMode && options.autoTrackSpaNavigations !== false)
            installAutoTracker(input)
        },
  }), _options as unknown as RegistryScriptInput<typeof SpeedCurveOptions>) as UseScriptContext<T>
}

export function applyConfig(options: SpeedCurveInput): void {
  const lux = window.LUX as Record<string, unknown> | undefined
  if (!lux)
    return
  for (const k of LUX_USER_CONFIG_KEYS) {
    const v = (options as Record<string, unknown>)[k as string]
    if (v === undefined)
      continue
    // label may be a function or false (handled by installAutoTracker); only pass strings to LUX directly
    if (k === 'label' && typeof v !== 'string')
      continue
    lux[k as string] = v
  }
}

export function installAutoTracker(options?: SpeedCurveInput): void {
  if (luxWired)
    return
  luxWired = true

  const router = useRouter()
  const nuxt = useNuxtApp()

  // For SPA-only apps (no SSR), the first beforeEach fires for the initial
  // client-side render — not a user navigation. Skip startSoftNavigation.
  let pendingInitial = nuxt.payload?.serverRendered === false

  const label = options?.label === false
    ? null
    : typeof options?.label === 'function'
      ? options.label
      : (to: RouteLocationNormalized) => String(to.name ?? to.path)

  router.beforeEach((to) => {
    const lux = window.LUX
    if (!lux)
      return
    if (pendingInitial) {
      pendingInitial = false
      if (label) {
        const nextLabel = label(to)
        if (nextLabel !== false)
          lux.label = nextLabel
      }
      return
    }
    lux.startSoftNavigation()
    if (label) {
      const nextLabel = label(to)
      if (nextLabel !== false)
        lux.label = nextLabel
    }
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

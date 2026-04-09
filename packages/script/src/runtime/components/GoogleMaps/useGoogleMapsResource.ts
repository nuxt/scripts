import type { InjectionKey, Ref, ShallowRef } from 'vue'
import { whenever } from '@vueuse/core'
import { effectScope, inject, onUnmounted, ref, shallowRef, watch } from 'vue'

export const MAP_INJECTION_KEY = Symbol('map') as InjectionKey<{
  map: ShallowRef<google.maps.Map | undefined>
  mapsApi: Ref<typeof google.maps | undefined>
  /** Close the previously active InfoWindow and register a new one as active */
  activateInfoWindow: (iw: google.maps.InfoWindow) => void
}>

export const MARKER_INJECTION_KEY = Symbol('marker') as InjectionKey<{
  advancedMarkerElement: ShallowRef<google.maps.marker.AdvancedMarkerElement | undefined>
}>

/**
 * Bind Google Maps event listeners that forward to Vue emit.
 *
 * Two categories:
 * - `noPayload`: emits with no arguments (state-change events like `position_changed`)
 * - `withPayload`: forwards the first argument from the listener (mouse events, etc.)
 */
export function bindGoogleMapsEvents(
  instance: { addListener: (event: string, handler: (...args: any[]) => void) => void },
  emit: (...args: any[]) => void,
  config: {
    noPayload?: readonly string[]
    withPayload?: readonly string[]
  },
) {
  config.noPayload?.forEach((event) => {
    instance.addListener(event, () => emit(event))
  })
  config.withPayload?.forEach((event) => {
    instance.addListener(event, (payload: any) => emit(event, payload))
  })
}

export interface GoogleMapsResourceContext {
  map: google.maps.Map
  mapsApi: typeof google.maps
}

/**
 * Emits dev-mode deprecation warnings for the legacy top-level `center` and
 * `zoom` props on `<ScriptGoogleMaps>`. Both props still work, but new code
 * should pass them via `mapOptions` instead.
 *
 * Returns the number of warnings emitted (useful for tests).
 */
export function warnDeprecatedTopLevelMapProps(props: {
  center?: unknown
  zoom?: unknown
}): number {
  let warned = 0
  if (props.center !== undefined) {
    warned++
    console.warn(
      '[nuxt-scripts] <ScriptGoogleMaps> prop "center" is deprecated; use `:map-options="{ center: ... }"` instead. See https://scripts.nuxt.com/docs/migration-guide/v0-to-v1',
    )
  }
  if (props.zoom !== undefined) {
    warned++
    console.warn(
      '[nuxt-scripts] <ScriptGoogleMaps> prop "zoom" is deprecated; use `:map-options="{ zoom: ... }"` instead. See https://scripts.nuxt.com/docs/migration-guide/v0-to-v1',
    )
  }
  return warned
}

/**
 * Wait until the Google Maps API and a Map instance are both available.
 *
 * Triggers script loading via `load()` if not already loaded. Uses an
 * immediate watcher (matching `importLibrary`'s pattern) to avoid the race
 * where `load()` resolves synchronously: a non-immediate watcher would miss
 * the change and the promise would hang forever.
 *
 * Rejects if `status` enters an `'error'` state before both refs are populated.
 * Runs the watcher inside a detached effect scope so it is safe to call from
 * any context (component setup, exposed methods, tests).
 */
export async function waitForMapsReady({
  mapsApi,
  map,
  status,
  load,
}: {
  mapsApi: ShallowRef<typeof google.maps | undefined>
  map: ShallowRef<google.maps.Map | undefined>
  status: Ref<string>
  load: () => Promise<unknown> | unknown
}): Promise<void> {
  if (mapsApi.value && map.value)
    return
  if (status.value === 'error')
    throw new Error('Google Maps script failed to load')

  await load()

  // load() may have populated both refs synchronously — re-check before
  // installing a watcher to avoid the race that hangs the promise forever.
  if (mapsApi.value && map.value)
    return
  if (status.value === 'error')
    throw new Error('Google Maps script failed to load')

  const scope = effectScope(true)
  try {
    await new Promise<void>((resolve, reject) => {
      scope.run(() => {
        watch(
          [mapsApi, map, status],
          ([api, m, s]) => {
            if (api && m) {
              resolve()
              return
            }
            if (s === 'error')
              reject(new Error('Google Maps script failed to load'))
          },
          { immediate: true },
        )
      })
    })
  }
  finally {
    scope.stop()
  }
}

/**
 * Composable for safely managing Google Maps resource lifecycle.
 *
 * Handles the common pattern: wait for map readiness → async create → cleanup on unmount.
 *
 * Safety guarantees:
 * - No watchers created after `await` (prevents orphaned watchers that leak memory)
 * - Unmount guard prevents resource creation after component unmount
 * - Resources created during the async gap are immediately cleaned up
 * - Resource ref is always nulled on unmount to allow GC
 */
export function useGoogleMapsResource<T>({
  ready,
  create,
  cleanup,
}: {
  /** Additional readiness condition beyond map + mapsApi being available */
  ready?: () => boolean
  /** Create the Google Maps resource. Receives map context snapshot. May be async. */
  create: (ctx: GoogleMapsResourceContext) => Promise<T> | T
  /** Clean up the resource. Called on unmount, or immediately if resource was created after unmount. */
  cleanup?: (resource: T, ctx: { mapsApi: typeof google.maps }) => void
}): ShallowRef<T | undefined> {
  const mapContext = inject(MAP_INJECTION_KEY, undefined)
  const resource = shallowRef<T | undefined>(undefined) as ShallowRef<T | undefined>
  const isUnmounted = ref(false)

  whenever(
    () => mapContext?.map.value && mapContext.mapsApi.value && (!ready || ready()),
    () => {
      Promise.resolve(create({
        map: mapContext!.map.value!,
        mapsApi: mapContext!.mapsApi.value!,
      }))
        .then((result) => {
          if (isUnmounted.value) {
            // Resource was created during the async gap after unmount — clean it up immediately
            if (cleanup && mapContext?.mapsApi.value) {
              cleanup(result, { mapsApi: mapContext.mapsApi.value })
            }
            return
          }
          resource.value = result
        })
        .catch((err) => {
          if (import.meta.dev) {
            console.error('[nuxt-scripts] Google Maps resource creation failed:', err)
          }
        })
    },
    { immediate: true, once: true },
  )

  onUnmounted(() => {
    isUnmounted.value = true
    if (resource.value && cleanup && mapContext?.mapsApi.value) {
      cleanup(resource.value, { mapsApi: mapContext.mapsApi.value })
    }
    resource.value = undefined
  })

  return resource
}

import type * as Leaflet from 'leaflet'
import type { InjectionKey, ShallowRef } from 'vue'
import { inject, onUnmounted, shallowRef, watch } from 'vue'

export type LeafletNamespace = typeof Leaflet

export interface LeafletMapContext {
  map: ShallowRef<Leaflet.Map | undefined>
  leaflet: ShallowRef<LeafletNamespace | undefined>
}

export const LEAFLET_MAP_INJECTION_KEY = Symbol('leaflet-map') as InjectionKey<LeafletMapContext>

export const LEAFLET_MARKER_INJECTION_KEY = Symbol('leaflet-marker') as InjectionKey<{
  marker: ShallowRef<Leaflet.Marker | undefined>
}>

export interface LeafletResourceContext {
  map: Leaflet.Map
  leaflet: LeafletNamespace
}

export function bindLeafletEvents(
  target: Leaflet.Evented,
  emit: (event: any, ...args: any[]) => void,
  events: readonly string[],
): void {
  for (const event of events)
    target.on(event, payload => emit(event, payload))
}

/**
 * Creates a Leaflet resource once its parent map and any component-specific
 * DOM refs are ready, then removes it synchronously during unmount.
 */
export function useLeafletResource<T>({
  ready,
  create,
  cleanup,
}: {
  ready?: () => boolean
  create: (context: LeafletResourceContext) => T
  cleanup: (resource: T, context: LeafletResourceContext) => void
}): ShallowRef<T | undefined> {
  const mapContext = inject(LEAFLET_MAP_INJECTION_KEY, undefined)
  const resource = shallowRef<T>() as ShallowRef<T | undefined>
  let creating = false
  let resourceContext: LeafletResourceContext | undefined

  if (import.meta.dev && !mapContext) {
    console.warn('[nuxt-scripts] Leaflet child components must be placed inside <ScriptLeafletMap>.')
  }

  const stop = watch(
    () => [mapContext?.map.value, mapContext?.leaflet.value, ready?.() ?? true] as const,
    ([map, leaflet, isReady]) => {
      if (!map || !leaflet || !isReady || resource.value || creating)
        return

      creating = true
      try {
        resourceContext = { map, leaflet }
        resource.value = create(resourceContext)
      }
      catch (error) {
        console.error('[nuxt-scripts] Leaflet resource creation failed:', error)
      }
      finally {
        creating = false
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    stop()
    if (resource.value && resourceContext)
      cleanup(resource.value, resourceContext)
    resource.value = undefined
    resourceContext = undefined
  })

  return resource
}

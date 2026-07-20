import type * as MapLibre from 'maplibre-gl'
import type { InjectionKey, ShallowRef } from 'vue'
import { inject, onUnmounted, shallowRef, watch } from 'vue'

export interface MapLibreMapContext {
  map: ShallowRef<MapLibre.Map | undefined>
  maplibre: ShallowRef<typeof MapLibre | undefined>
}

export const MAPLIBRE_MAP_INJECTION_KEY = Symbol('maplibre-map') as InjectionKey<MapLibreMapContext>

export const MAPLIBRE_MARKER_INJECTION_KEY = Symbol('maplibre-marker') as InjectionKey<{
  marker: ShallowRef<MapLibre.Marker | undefined>
}>

export interface MapLibreResourceContext {
  map: MapLibre.Map
  maplibre: typeof MapLibre
}

/**
 * Creates a MapLibre resource after its parent map and any component-specific
 * DOM refs are ready, then removes it synchronously during unmount.
 */
export function useMapLibreResource<T>({
  ready,
  create,
  cleanup,
}: {
  ready?: () => boolean
  create: (context: MapLibreResourceContext) => T
  cleanup: (resource: T, context: MapLibreResourceContext) => void
}): ShallowRef<T | undefined> {
  const mapContext = inject(MAPLIBRE_MAP_INJECTION_KEY, undefined)
  const resource = shallowRef<T>() as ShallowRef<T | undefined>
  let creating = false
  let resourceContext: MapLibreResourceContext | undefined

  if (import.meta.dev && !mapContext) {
    console.warn('[nuxt-scripts] MapLibre child components must be placed inside <ScriptMapLibreMap>.')
  }

  const stop = watch(
    () => [mapContext?.map.value, mapContext?.maplibre.value, ready?.() ?? true] as const,
    ([map, maplibre, isReady]) => {
      if (!map || !maplibre || !isReady || resource.value || creating)
        return

      creating = true
      try {
        resourceContext = { map, maplibre }
        resource.value = create(resourceContext)
      }
      catch (error) {
        console.error('[nuxt-scripts] MapLibre resource creation failed:', error)
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

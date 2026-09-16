<script lang="ts">
export type {
  ScriptMapLibreGeoJsonEmits,
  ScriptMapLibreGeoJsonLayer,
  ScriptMapLibreGeoJsonProps,
  ScriptMapLibreGeoJsonResource,
} from './types'
</script>

<script setup lang="ts">
import type * as MapLibreGl from 'maplibre-gl'
import type { ScriptMapLibreGeoJsonEmits, ScriptMapLibreGeoJsonLayer, ScriptMapLibreGeoJsonProps, ScriptMapLibreGeoJsonResource } from './types'
import { toRaw, watch } from 'vue'
import { reportMapLibreResourceError, useMapLibreResource } from './useMapLibreResource'

/** Layer values MapLibre can update on a layer that is already on the map. */
interface LayerStyle {
  paint: Record<string, unknown>
  layout: Record<string, unknown>
  filter: unknown
}

// Renders no DOM of its own. A render function that returns `null` gives a
// comment node on the server and the client. A template that holds only a
// comment, or nothing, renders nothing on the server, so hydration mismatches.
defineOptions({ render: () => null })

const props = defineProps<ScriptMapLibreGeoJsonProps>()

const emit = defineEmits<ScriptMapLibreGeoJsonEmits>()

let ownedLayerIds: string[] = []
let ownedSourceId: string | undefined
let appliedStructure: string | undefined
let appliedStyleSignature: string | undefined
let appliedStyles: LayerStyle[] = []
let layerSubscriptions: MapLibreGl.Subscription[] = []
let restoreCursor: string | undefined
let isPointerOverLayer = false
let hoveredLayerKey = ''
let pendingHoverKey = ''

/**
 * True while the style accepts `addSource` and `addLayer`. MapLibre allows both
 * from `style.load` onwards. `isStyleLoaded()` is a stricter signal: it also
 * waits for every tile and the sprite, so it is still false at `style.load`.
 */
let isStyleMutable = false
/** A sync was skipped because the style was mid-swap. The next ready signal runs it. */
let hasPendingSync = false
/** Collects the map errors fired while this component applies one style change. */
let capturedErrors: Error[] | undefined

/** A map `error` event. MapLibre adds `sourceId` or `layer` when a source or layer fired it. */
interface MapErrorEvent {
  error: Error | { message: string }
  sourceId?: string
  layer?: { id?: string }
}

function toError(event: MapErrorEvent): Error {
  return event.error instanceof Error ? event.error : new Error(event.error.message, { cause: event.error })
}

/**
 * Runs one style change and throws the errors MapLibre fired during it.
 *
 * MapLibre does not throw for an invalid layer, paint, layout or filter value.
 * It fires a map `error` event and skips the change. The event fires
 * synchronously inside the call, so an error fired during it belongs to this
 * component. Matching the message against a layer ID would be ambiguous,
 * because a layer ID may contain a dot.
 */
function applyStyleChange(change: () => void): void {
  const errors: Error[] = []
  capturedErrors = errors
  try {
    change()
  }
  finally {
    capturedErrors = undefined
  }
  if (errors.length === 1)
    throw errors[0]
  if (errors.length > 1)
    throw new AggregateError(errors, errors.map(error => error.message).join('\n'))
}

/**
 * Handles every map error. An error from this component's own change is thrown by
 * `applyStyleChange`. A later error is emitted only when it names this
 * component's source or one of its layers, so basemap and tile failures stay
 * with the map.
 */
function onMapError(event: MapErrorEvent): void {
  if (capturedErrors) {
    capturedErrors.push(toError(event))
    return
  }
  const isOwnSource = ownedSourceId !== undefined && event.sourceId === ownedSourceId
  const isOwnLayer = event.layer?.id !== undefined && ownedLayerIds.includes(event.layer.id)
  if (isOwnSource || isOwnLayer)
    reportMapLibreResourceError(toError(event), failure => emit('error', failure))
}

/**
 * Layer keys the component cannot update in place. A change rebuilds the source.
 * The layer is read through its reactive proxy, so a deep change is tracked.
 */
function layerStructure(layer: ScriptMapLibreGeoJsonLayer): Record<string, unknown> {
  const structure = { ...layer } as Record<string, unknown>
  delete structure.paint
  delete structure.layout
  delete structure.filter
  return structure
}

/**
 * Content signature of every prop that forces a source and layer rebuild.
 * An inline array or object literal changes identity on each parent render, so
 * the component compares content instead of identity.
 */
function structureSignature(): string {
  return JSON.stringify([
    props.sourceId,
    props.sourceOptions ?? null,
    props.beforeId ?? null,
    props.layers.map(layerStructure),
  ])
}

/**
 * Reads the paint, layout and filter values of every layer, in prop order.
 * The layer is read through its reactive proxy, so a deep change is tracked.
 */
function readLayerStyles(): LayerStyle[] {
  return props.layers.map((layer) => {
    const source = layer as Record<string, unknown>
    return {
      paint: (source.paint ?? {}) as Record<string, unknown>,
      layout: (source.layout ?? {}) as Record<string, unknown>,
      filter: source.filter,
    }
  })
}

/** Content signature of the layer values the component can update in place. */
function styleSignature(): string {
  return JSON.stringify(readLayerStyles())
}

/** Detaches the read values from the props, so MapLibre never holds a proxy. */
function detachLayerStyles(signature: string): LayerStyle[] {
  return JSON.parse(signature) as LayerStyle[]
}

/** Applies the `cursor` prop while the pointer is over an owned layer. */
function applyCursor(map: MapLibreGl.Map, cursor: string | undefined): void {
  const canvas = map.getCanvas()
  if (!canvas)
    return
  if (cursor === undefined) {
    if (restoreCursor !== undefined)
      canvas.style.cursor = restoreCursor
    restoreCursor = undefined
    return
  }
  restoreCursor ??= canvas.style.cursor
  canvas.style.cursor = cursor
}

function unbindLayerEvents(map: MapLibreGl.Map): void {
  for (const subscription of layerSubscriptions)
    subscription.unsubscribe()
  layerSubscriptions = []
  // Carry the hover across an immediate rebind. `syncResources` unbinds twice,
  // so an empty key must never overwrite a carried one.
  if (isPointerOverLayer)
    pendingHoverKey = hoveredLayerKey
  isPointerOverLayer = false
  if (restoreCursor !== undefined)
    applyCursor(map, undefined)
}

/**
 * Binds the component's events to the layers it owns. MapLibre treats the layer
 * array as one group, so `mouseenter` and `mouseleave` fire once per group.
 * `mousemove` fires on every move over any feature, so it tracks the feature
 * under the pointer as it slides between touching features.
 *
 * `carryHover` is true only for a style reload, where the props are unchanged
 * and the same features sit under the pointer.
 */
function bindLayerEvents(map: MapLibreGl.Map, carryHover: boolean): void {
  unbindLayerEvents(map)
  const carriedHoverKey = pendingHoverKey
  pendingHoverKey = ''
  if (!ownedLayerIds.length)
    return
  const layerIds = [...ownedLayerIds]
  const layerKey = layerIds.join('\n')
  layerSubscriptions = [
    map.on('click', layerIds, event => emit('click', event)),
    // The emit must stay synchronous, so `event.preventDefault()` still stops
    // MapLibre's double-click zoom.
    map.on('dblclick', layerIds, event => emit('dblclick', event)),
    map.on('mousemove', layerIds, event => emit('mousemove', event)),
    map.on('mouseenter', layerIds, (event) => {
      isPointerOverLayer = true
      hoveredLayerKey = layerKey
      applyCursor(map, props.cursor || undefined)
      emit('mouseenter', event)
    }),
    map.on('mouseleave', layerIds, (event) => {
      isPointerOverLayer = false
      applyCursor(map, undefined)
      emit('mouseleave', event)
    }),
  ]
  // A style reload re-adds the same layers under a stationary pointer, and
  // MapLibre does not fire `mouseenter` again. A prop change may move the
  // features, so only a style reload of the same layers keeps the cursor.
  if (carryHover && carriedHoverKey === layerKey) {
    isPointerOverLayer = true
    applyCursor(map, props.cursor || undefined)
  }
}

function removeOwnedResources(map: MapLibreGl.Map): void {
  unbindLayerEvents(map)
  for (const layerId of [...ownedLayerIds].reverse()) {
    if (map.getLayer(layerId))
      map.removeLayer(layerId)
  }
  ownedLayerIds = []
  if (ownedSourceId && map.getSource(ownedSourceId))
    map.removeSource(ownedSourceId)
  ownedSourceId = undefined
  appliedStructure = undefined
  appliedStyleSignature = undefined
  appliedStyles = []
}

function syncResources(map: MapLibreGl.Map, carryHover = false): void {
  if (!isStyleMutable && map.isStyleLoaded() !== true) {
    // The style is mid-swap and rejects new sources. Clear the applied values, or
    // a later flip back to the last applied value would skip the rebuild.
    appliedStructure = undefined
    appliedStyleSignature = undefined
    hasPendingSync = true
    return
  }

  hasPendingSync = false
  removeOwnedResources(map)
  const sourceId = props.sourceId
  try {
    applyStyleChange(() => map.addSource(sourceId, {
      ...toRaw(props.sourceOptions),
      type: 'geojson',
      data: toRaw(props.data),
    }))
    ownedSourceId = sourceId

    for (const layer of props.layers) {
      const nextLayer = {
        ...toRaw(layer),
        source: layer.source || sourceId,
      } as MapLibreGl.LayerSpecification
      applyStyleChange(() => map.addLayer(nextLayer, props.beforeId))
      if (!map.getLayer(nextLayer.id))
        throw new Error(`MapLibre did not add the layer "${nextLayer.id}".`)
      ownedLayerIds.push(nextLayer.id)
    }
    appliedStructure = structureSignature()
    appliedStyleSignature = styleSignature()
    appliedStyles = detachLayerStyles(appliedStyleSignature)
    bindLayerEvents(map, carryHover)
  }
  catch (error) {
    removeOwnedResources(map)
    throw error
  }
  // Emitted outside the style change, so a map error from the consumer's handler
  // is never attributed to this component.
  emit('sourceready', { map, sourceId })
}

/** Applies every changed entry of one paint or layout block to a live layer. */
function applyStyleBlock(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  set: (name: string, value: unknown) => void,
): void {
  for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[name]) !== JSON.stringify(after[name]))
      set(name, after[name])
  }
}

/**
 * Updates paint, layout and filter on the layers already on the map. The source
 * keeps its data and, for a clustered source, its cluster index.
 */
function updateLayerStyles(map: MapLibreGl.Map): void {
  const signature = styleSignature()
  const nextStyles = detachLayerStyles(signature)
  nextStyles.forEach((next, index) => {
    const before = appliedStyles[index]
    const layerId = ownedLayerIds[index]
    if (!before || !layerId || !map.getLayer(layerId))
      return
    // MapLibre keys these setters by layer type. The layer array is a union, so
    // the property name is only known as a string here.
    applyStyleBlock(before.paint, next.paint, (name, value) => {
      applyStyleChange(() => map.setPaintProperty(layerId, name as keyof MapLibreGl.AllPaintProperties, value as never))
    })
    applyStyleBlock(before.layout, next.layout, (name, value) => {
      applyStyleChange(() => map.setLayoutProperty(layerId, name as keyof MapLibreGl.AllLayoutProperties, value as never))
    })
    if (JSON.stringify(before.filter) !== JSON.stringify(next.filter))
      applyStyleChange(() => map.setFilter(layerId, next.filter as MapLibreGl.FilterSpecification | undefined))
  })
  // The new values may have emptied the spot under a stationary pointer, and
  // MapLibre only re-evaluates on the next pointer move. A prop-driven rebuild
  // drops the hover for the same reason.
  if (isPointerOverLayer) {
    isPointerOverLayer = false
    applyCursor(map, undefined)
  }
  // Only a complete pass records the new values, so a failed update is retried.
  appliedStyles = nextStyles
  appliedStyleSignature = signature
}

/** Runs a rebuild outside the initial creation, where no caller can catch it. */
function trySyncResources(map: MapLibreGl.Map, carryHover = false): void {
  try {
    syncResources(map, carryHover)
  }
  catch (error) {
    reportMapLibreResourceError(error, failure => emit('error', failure))
  }
}

function tryUpdateLayerStyles(map: MapLibreGl.Map): void {
  try {
    updateLayerStyles(map)
  }
  catch (error) {
    reportMapLibreResourceError(error, failure => emit('error', failure))
  }
}

const geoJson = useMapLibreResource<ScriptMapLibreGeoJsonResource>({
  create({ map }) {
    isStyleMutable = map.isStyleLoaded() === true
    // MapLibre drops every source and layer when a style loads, so the component
    // re-adds its own. `style.load` is the first moment the new style accepts them.
    const onStyleLoad = () => {
      isStyleMutable = true
      trySyncResources(map, true)
    }
    const onLoad = () => {
      isStyleMutable = true
      if (!ownedSourceId)
        trySyncResources(map)
    }
    // A full style reload starts here. The new style rejects new sources until
    // `style.load` fires.
    const onStyleDataLoading = () => {
      isStyleMutable = false
      hasPendingSync = true
    }
    // The map only goes idle once the style reports loaded, so this is the last
    // safety net for a sync that arrived while the style was busy.
    const onIdle = () => {
      isStyleMutable = true
      if (hasPendingSync)
        trySyncResources(map)
    }
    map.on('style.load', onStyleLoad)
    map.on('load', onLoad)
    map.on('styledataloading', onStyleDataLoading)
    map.on('idle', onIdle)
    map.on('error', onMapError)
    // A failed first sync must not discard the resource. The style and prop
    // listeners stay registered, so a corrected layer rebuilds without a remount.
    trySyncResources(map)
    return { map, onLoad, onStyleLoad, onStyleDataLoading, onIdle, onError: onMapError }
  },
  onError: error => emit('error', error),
  cleanup(resource) {
    resource.map.off('load', resource.onLoad)
    resource.map.off('style.load', resource.onStyleLoad)
    resource.map.off('styledataloading', resource.onStyleDataLoading)
    resource.map.off('idle', resource.onIdle)
    resource.map.off('error', resource.onError)
    removeOwnedResources(resource.map)
  },
})

watch(() => props.data, (data) => {
  const source = geoJson.value?.map.getSource(props.sourceId)
  if (source?.type === 'geojson')
    (source as MapLibreGl.GeoJSONSource).setData(toRaw(data))
}, { deep: 2 })

// The cursor is a presentation prop, so it stays out of the resource signature.
// Applying it here keeps it reactive without rebuilding the source and layers.
watch(() => props.cursor, (cursor) => {
  if (isPointerOverLayer && geoJson.value)
    applyCursor(geoJson.value.map, cursor || undefined)
})

watch(structureSignature, (structure) => {
  if (geoJson.value && structure !== appliedStructure)
    trySyncResources(geoJson.value.map)
})

// Runs after the structure watcher, so a rebuild has already applied the new
// values and this watcher finds nothing left to do.
watch(styleSignature, (signature) => {
  const map = geoJson.value?.map
  if (!map || signature === appliedStyleSignature)
    return
  // The layers on the map match the other props, so MapLibre can take the new
  // values directly. Otherwise nothing is applied yet and the source is rebuilt.
  if (structureSignature() === appliedStructure)
    tryUpdateLayerStyles(map)
  else
    trySyncResources(map)
})

defineExpose({ geoJson })
</script>

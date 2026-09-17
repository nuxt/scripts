import type { GeoJSON } from 'geojson'
import type * as MapLibre from 'maplibre-gl'
import type { HTMLAttributes, ReservedProps, ShallowRef } from 'vue'
import type { ElementScriptTrigger } from '../../types'

/**
 * Public types for the MapLibre components. They are re-exported from
 * `@nuxt/scripts` so a consumer can type refs, layer arrays and event payloads
 * without a deep import.
 */

/** Props every `<ScriptMapLibreMap>` accepts, whichever prop frames the initial camera. */
export interface ScriptMapLibreMapSharedProps {
  /**
   * Defines when the MapLibre script loads.
   * @default 'visible'
   */
  trigger?: ElementScriptTrigger
  /** MapLibre style URL or inline style specification. */
  mapStyle: string | MapLibre.StyleSpecification
  /**
   * Options for the fit to `bounds`. MapLibre applies the first fit without animation.
   * A later `bounds` change also fits without animation.
   * The fit keeps the `bearing` prop unless these options set `bearing`.
   */
  fitBoundsOptions?: MapLibre.FitBoundsOptions
  /** Initial and reactively controlled zoom level. `bounds` overrides the initial zoom. @default 12 */
  zoom?: number
  /** Initial and reactively controlled bearing in degrees. @default 0 */
  bearing?: number
  /** Initial and reactively controlled pitch in degrees. @default 0 */
  pitch?: number
  /** Options passed to `new maplibregl.Map()`. Dedicated props take precedence. */
  options?: Omit<MapLibre.MapOptions, 'container'>
  /** Inject MapLibre's stylesheet when the script begins loading. @default true */
  injectStyles?: boolean
  /** Custom MapLibre stylesheet URL. */
  stylesheetUrl?: string
  /** Worker URL passed to `maplibregl.setWorkerUrl()`. */
  workerUrl?: string
  /** Width reserved before the map loads. @default 640 */
  width?: number | string
  /** Height reserved before the map loads. @default 400 */
  height?: number | string
  /** Accessible name for an interactive map. @default 'Interactive map' */
  ariaLabel?: string
  /** Disable map input and remove it from the accessibility tree when decorative. @default true */
  interactive?: boolean
  /** Attributes applied to the outer layout container. */
  rootAttrs?: HTMLAttributes & ReservedProps & Record<string, unknown>
}

/** Frames the initial camera on `center`. `bounds` stays optional. */
export interface ScriptMapLibreMapCenterCamera {
  /**
   * Initial and reactively controlled map center. Required unless `bounds` is set.
   * `bounds` overrides the initial center.
   */
  center: MapLibre.LngLatLike
  /**
   * Area the camera fits on first render. It overrides the initial `center` and `zoom`.
   * A change to its coordinates fits the camera again.
   */
  bounds?: MapLibre.LngLatBoundsLike
}

/** Frames the initial camera on `bounds`. `center` becomes optional. */
export interface ScriptMapLibreMapBoundsCamera {
  /**
   * Initial and reactively controlled map center. Required unless `bounds` is set.
   * `bounds` overrides the initial center.
   */
  center?: MapLibre.LngLatLike
  /**
   * Area the camera fits on first render. It overrides the initial `center` and `zoom`.
   * A change to its coordinates fits the camera again.
   */
  bounds: MapLibre.LngLatBoundsLike
}

/**
 * The map needs `center` or `bounds` to frame its first camera, so the type
 * rejects a map with neither.
 */
export type ScriptMapLibreMapProps = ScriptMapLibreMapSharedProps
  & (ScriptMapLibreMapCenterCamera | ScriptMapLibreMapBoundsCamera)

export interface ScriptMapLibreMapExpose {
  maplibre: ShallowRef<typeof MapLibre | undefined>
  map: ShallowRef<MapLibre.Map | undefined>
  load: () => Promise<unknown> | unknown
  /** Moves the camera so the bounds fit the viewport. Does nothing before the map exists. */
  fitBounds: (bounds: MapLibre.LngLatBoundsLike, options?: MapLibre.FitBoundsOptions) => void
  /** Animates the camera along a straight path. Does nothing before the map exists. */
  easeTo: (options: MapLibre.EaseToOptions) => void
  /** Animates the camera along a curved flight path. Does nothing before the map exists. */
  flyTo: (options: MapLibre.FlyToOptions) => void
}

export interface ScriptMapLibreMapEmits {
  'ready': [payload: ScriptMapLibreMapExpose]
  'error': [error: Error]
  /** The map finished its first complete render. Sources and layers are safe to add. */
  'load': [event: MapLibre.MapEventType['load']]
  /** The style finished loading. MapLibre drops every source and layer before this fires. */
  'styleload': [event: MapLibre.MapEventType['style.load']]
  'click': [event: MapLibre.MapEventType['click']]
  'move': [event: MapLibre.MapEventType['move']]
  'moveend': [event: MapLibre.MapEventType['moveend']]
  'zoom': [event: MapLibre.MapEventType['zoom']]
  'zoomend': [event: MapLibre.MapEventType['zoomend']]
  'rotate': [event: MapLibre.MapEventType['rotate']]
  'rotateend': [event: MapLibre.MapEventType['rotateend']]
  'pitch': [event: MapLibre.MapEventType['pitch']]
  'pitchend': [event: MapLibre.MapEventType['pitchend']]
  'update:center': [center: MapLibre.LngLat]
  'update:zoom': [zoom: number]
  'update:bearing': [bearing: number]
  'update:pitch': [pitch: number]
}

export interface ScriptMapLibreMapSlots {
  default?: () => any
  loading?: () => any
  awaitingLoad?: () => any
  error?: (props: { error: Error }) => any
  placeholder?: () => any
  /** Text or links that expose the canvas map's essential information to assistive technology. */
  description?: () => any
}

/**
 * Layer kinds a GeoJSON source can render. MapLibre's own style validation
 * rejects the rest: `hillshade` and `color-relief` need a `raster-dem` source,
 * `raster` needs raster tiles, and `background` takes no source at all.
 */
type GeoJsonLayerType = 'circle' | 'fill' | 'fill-extrusion' | 'heatmap' | 'line' | 'symbol'

/**
 * A style layer for this component's source.
 *
 * `LayerSpecification` is a union and a plain `Omit` is not distributive, so it
 * collapses the union to its common keys and drops `filter`. MapLibre's own
 * `DistributiveOmit` keeps each member, so `type` narrows `filter`, `paint` and
 * `layout` for that layer kind.
 *
 * Only a GeoJSON-compatible layer may leave `source` out. A `raster`,
 * `hillshade` or `color-relief` layer must name its own source.
 */
export type ScriptMapLibreGeoJsonLayer
  = | (MapLibre.DistributiveOmit<Extract<MapLibre.LayerSpecification, { type: GeoJsonLayerType }>, 'source'> & {
    /** Override the component's source ID for this layer. */
    source?: string
  })
  | Extract<MapLibre.LayerSpecification, { type: 'color-relief' | 'hillshade' | 'raster' }>

export interface ScriptMapLibreGeoJsonProps {
  /** MapLibre source ID. Changing it rebuilds the owned source and layers. */
  sourceId: string
  /** Inline GeoJSON data or a URL returning GeoJSON. */
  data: GeoJSON | string
  /**
   * GeoJSON source options. `type` and `data` are supplied by the component.
   * A change to `cluster`, `clusterRadius` or `clusterMaxZoom` alone updates the source in place.
   * Any other change rebuilds the source and the layers.
   */
  sourceOptions?: Omit<MapLibre.GeoJSONSourceSpecification, 'type' | 'data'>
  /**
   * Style layers backed by this source.
   * A paint, layout or filter change updates the layers in place.
   * Any other change rebuilds the source and the layers.
   */
  layers: ScriptMapLibreGeoJsonLayer[]
  /** Existing layer ID before which the layers are inserted. */
  beforeId?: string
  /** CSS cursor applied while the pointer is over one of these layers. */
  cursor?: string
}

export interface ScriptMapLibreGeoJsonEmits {
  /**
   * The component could not apply a source or layer, or MapLibre reported an error for one.
   * MapLibre reports an invalid paint, layout or filter value this way. It does not throw.
   * A failed rebuild removes the component's own source and layers.
   * A failed paint, layout, filter or cluster option update leaves them on the map.
   */
  error: [error: Error]
  /** The pointer clicked one of this component's layers. */
  click: [event: MapLibre.MapLayerMouseEvent]
  /**
   * The pointer double-clicked one of this component's layers.
   * Call `event.preventDefault()` to stop MapLibre's double-click zoom.
   */
  dblclick: [event: MapLibre.MapLayerMouseEvent]
  /**
   * The pointer entered this component's layers as a group.
   * It does not fire again when the pointer moves between touching features.
   */
  mouseenter: [event: MapLibre.MapLayerMouseEvent]
  /**
   * The pointer moved over a feature in one of this component's layers.
   * `event.features` lists the features under the pointer, topmost first.
   */
  mousemove: [event: MapLibre.MapLayerMouseEvent]
  /** The pointer left every feature in this component's layers. */
  mouseleave: [event: MapLibre.MapLayerMouseEvent]
  /**
   * The source and layers exist on the map.
   * Fires after the first add and after every re-add, such as after a style swap.
   * A re-add clears feature state, so restore it here.
   */
  sourceready: [payload: { map: MapLibre.Map, sourceId: string }]
}

export interface ScriptMapLibreGeoJsonResource {
  map: MapLibre.Map
  onLoad: () => void
  onStyleLoad: () => void
  onStyleDataLoading: () => void
  onIdle: () => void
  onError: (event: { error: Error | { message: string } }) => void
  onSourceDataLoading: (event: MapLibre.MapSourceDataEvent) => void
  onSourceData: (event: MapLibre.MapSourceDataEvent) => void
}

export interface ScriptMapLibreMarkerProps {
  /** Reactive marker position in `[longitude, latitude]` order. */
  position: MapLibre.LngLatLike
  /** Accessible name for the marker element. */
  ariaLabel?: string
  /** Tooltip text for the marker element. */
  title?: string
  /** Options passed to `new maplibregl.Marker()`. Options with public setters also update reactively. */
  options?: MapLibre.MarkerOptions
}

export interface ScriptMapLibreMarkerEmits {
  click: [event: MouseEvent]
  dragstart: [event: MapLibre.Event]
  drag: [event: MapLibre.Event]
  dragend: [event: MapLibre.Event]
}

export interface ScriptMapLibrePopupProps {
  /** Position for a standalone popup. Omit when nested inside a marker. */
  position?: MapLibre.LngLatLike
  /** Whether the popup is open. @default false */
  open?: boolean
  /** Options passed to `new maplibregl.Popup()`. Options with public setters also update reactively. */
  options?: MapLibre.PopupOptions
}

export interface ScriptMapLibrePopupEmits {
  open: [event: MapLibre.Event]
  close: [event: MapLibre.Event]
}

export interface ScriptMapLibreNavigationControlProps {
  /** Position of the navigation control. */
  position?: MapLibre.ControlPosition
  /** Options passed to `new maplibregl.NavigationControl()`. */
  options?: MapLibre.NavigationControlOptions
}

export interface ScriptMapLibreScaleControlProps {
  /** Position of the scale control. MapLibre places it bottom-left by default. */
  position?: MapLibre.ControlPosition
  /**
   * Options passed to `new maplibregl.ScaleControl()`.
   * `unit` also updates reactively through `setUnit()`.
   */
  options?: MapLibre.ScaleControlOptions
}

export interface ScriptMapLibreGeolocateControlProps {
  /** Position of the geolocate control. */
  position?: MapLibre.ControlPosition
  /** Options passed to `new maplibregl.GeolocateControl()`. */
  options?: MapLibre.GeolocateControlOptions
}

export interface ScriptMapLibreGeolocateControlEmits {
  /** The Geolocation API returned a position. */
  geolocate: [event: MapLibre.GeolocateControlEventType['geolocate']]
  /**
   * The Geolocation API returned an error.
   * `code` 1 means the user denied permission. MapLibre then disables the button.
   */
  error: [event: MapLibre.GeolocateControlEventType['error']]
  /** The position is outside the map's `maxBounds`. */
  outofmaxbounds: [event: MapLibre.GeolocateControlEventType['outofmaxbounds']]
  /** The control entered the active lock state. Needs `trackUserLocation`. */
  trackuserlocationstart: [event: MapLibre.GeolocateControlEventType['trackuserlocationstart']]
  /** The control left the active lock state. Needs `trackUserLocation`. */
  trackuserlocationend: [event: MapLibre.GeolocateControlEventType['trackuserlocationend']]
  /** The user clicked the button in the active lock state. */
  userlocationfocus: [event: MapLibre.GeolocateControlEventType['userlocationfocus']]
  /** The user moved the map in the active lock state. */
  userlocationlostfocus: [event: MapLibre.GeolocateControlEventType['userlocationlostfocus']]
  /**
   * Geolocation cannot work in this browser.
   * `permission-denied` means the user blocked it before the control loaded.
   * MapLibre disables the button and fires no `error` event in both cases.
   */
  unavailable: [reason: 'unsupported' | 'permission-denied']
}

export interface ScriptMapLibreFullscreenControlProps {
  /** Position of the fullscreen control. */
  position?: MapLibre.ControlPosition
  /** Options passed to `new maplibregl.FullscreenControl()`. */
  options?: MapLibre.FullscreenControlOptions
}

export interface ScriptMapLibreFullscreenControlEmits {
  /** The map entered fullscreen mode. */
  fullscreenstart: [event: MapLibre.FullscreenControlEventType['fullscreenstart']]
  /** The map left fullscreen mode. */
  fullscreenend: [event: MapLibre.FullscreenControlEventType['fullscreenend']]
}

export interface ScriptMapLibreAttributionControlProps {
  /** Position of the attribution control. MapLibre places it bottom-right by default. */
  position?: MapLibre.ControlPosition
  /**
   * Options passed to `new maplibregl.AttributionControl()`.
   * Source attribution from the style and tiles always shows. `customAttribution` only adds text.
   */
  options?: MapLibre.AttributionControlOptions
}

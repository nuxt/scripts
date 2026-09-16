import type { FeatureCollection, Point } from 'geojson'
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'

/**
 * A style with no remote sources, glyphs or sprites. The browser tests never
 * wait on the network, so they stay deterministic in CI.
 */
export function blankStyle(color: string, metadata?: Record<string, unknown>): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': color }, metadata }],
  }
}

export function points(entries: Array<{ id: number, name: string, kind: string, position: [number, number] }>): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: entries.map(entry => ({
      type: 'Feature',
      id: entry.id,
      properties: { name: entry.name, kind: entry.kind },
      geometry: { type: 'Point', coordinates: entry.position },
    })),
  }
}

/** Hands the live map to the browser test through `window`. */
export function exposeMap(map: MapLibreMap | undefined): void {
  ;(window as any).__map = map
}

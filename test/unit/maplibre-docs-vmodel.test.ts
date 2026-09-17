import { describe, expect, it } from 'vitest'
import docsPage from '../../docs/content/scripts/maplibre/2.api/1.script-maplibre-map.md?raw'
import { getRegistrySchemaFields } from '../../packages/script/src/types-source'

// Camera props of <ScriptMapLibreMap>. A camera prop advertised as
// `v-model`-bindable needs a matching `update:<prop>` emit, or the binding
// silently never fires.
const CAMERA_PROPS = ['center', 'zoom', 'bearing', 'pitch', 'bounds']

function advertisedVModelProps(markdown: string): string[] {
  const prose = markdown.replace(/```[\s\S]*?```/g, '')
  const advertised = new Set<string>()
  for (const paragraph of prose.split(/\n{2,}/)) {
    if (!paragraph.includes('v-model'))
      continue
    for (const match of paragraph.matchAll(/`(\w+)`/g)) {
      if (CAMERA_PROPS.includes(match[1]!))
        advertised.add(match[1]!)
    }
  }
  return [...advertised]
}

describe('maplibre map docs v-model conformance', () => {
  it('only advertises v-model bindings the component can emit', () => {
    const emitted = (getRegistrySchemaFields().ScriptMapLibreMapEvents ?? [])
      .map(event => event.name)
      .filter(name => name.startsWith('update:'))

    for (const prop of advertisedVModelProps(docsPage))
      expect(emitted, `docs advertise v-model:${prop} but the component has no update:${prop} emit`).toContain(`update:${prop}`)
  })
})

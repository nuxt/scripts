import { describe, expect, it } from 'vitest'
import { fieldsToInterfaceBody, parseSchemaComments } from '../../scripts/registry-doc-comments'

describe('parseSchemaComments + fieldsToInterfaceBody', () => {
  it('keeps single-line JSDoc in the generated interface body', () => {
    const propsCode = `{
  /** MapLibre style URL or inline style specification. */
  mapStyle: string | MapLibre.StyleSpecification
  /** Initial and reactively controlled zoom level. \`bounds\` overrides the initial zoom. @default 12 */
  zoom?: number
  /**
   * Initial and reactively controlled map center.
   * \`bounds\` overrides the initial center.
   */
  center?: MapLibre.LngLatLike
}`

    const comments = parseSchemaComments(propsCode)
    const body = fieldsToInterfaceBody([
      { name: 'mapStyle', type: 'string | MapLibre.StyleSpecification', required: true, description: comments.mapStyle?.description },
      { name: 'zoom', type: 'number', required: false, description: comments.zoom?.description, defaultValue: comments.zoom?.defaultValue },
      { name: 'center', type: 'MapLibre.LngLatLike', required: false, description: comments.center?.description },
    ])

    expect(body).toContain('/** MapLibre style URL or inline style specification. */\n  mapStyle:')
    expect(body).toContain('/** Initial and reactively controlled zoom level. `bounds` overrides the initial zoom. @default 12 */\n  zoom?:')
    expect(body).toContain('/** Initial and reactively controlled map center. `bounds` overrides the initial center. */\n  center?:')
  })

  it('reads a single-line JSDoc comment written on the field line', () => {
    const comments = parseSchemaComments('{\n  /** MapLibre style URL. */ mapStyle: string\n}')
    expect(comments.mapStyle?.description).toBe('MapLibre style URL.')
  })
})

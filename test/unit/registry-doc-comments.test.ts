import { describe, expect, it } from 'vitest'
import { parseSchemaComments } from '../../scripts/registry-doc-comments'

describe('parseSchemaComments', () => {
  it('keeps single-line JSDoc on the field line', () => {
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
    expect(comments.mapStyle?.description).toBe('MapLibre style URL or inline style specification.')
    expect(comments.zoom).toMatchObject({
      description: 'Initial and reactively controlled zoom level. `bounds` overrides the initial zoom.',
      defaultValue: '12',
    })
    expect(comments.center?.description).toBe('Initial and reactively controlled map center. `bounds` overrides the initial center.')
  })

  it('reads a single-line JSDoc comment written on the field line', () => {
    const comments = parseSchemaComments('{\n  /** MapLibre style URL. */ mapStyle: string\n}')
    expect(comments.mapStyle?.description).toBe('MapLibre style URL.')
  })
})

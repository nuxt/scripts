import { describe, expect, it, vi } from 'vitest'

// Mock registry-types.json before importing the module
vi.mock('../../src/registry-types.json', () => ({
  default: {
    'test-script': [
      {
        name: 'TestOptions',
        kind: 'const',
        code: `export const TestOptions = object({
  /**
   * The API key.
   *
   * @default 'abc'
   */
  apiKey: string(),
  enabled: optional(boolean()), // Whether tracking is enabled
})`,
      },
      {
        name: 'TestApi',
        kind: 'interface',
        code: 'export interface TestApi { track: (event: string) => void }',
      },
      {
        name: 'TestDefaults',
        kind: 'const',
        code: 'const TestDefaults = { "trigger": "\'click\'" }',
      },
    ],
    'empty-script': [
      {
        name: 'EmptyApi',
        kind: 'interface',
        code: 'export interface EmptyApi {}',
      },
    ],
  },
}))

// Mock registry-schemas with matching schema for TestOptions
vi.mock('../../src/registry-schemas', () => ({
  TestOptions: {
    entries: {
      apiKey: { type: 'string' },
      enabled: { type: 'optional', wrapped: { type: 'boolean' } },
    },
  },
}))

const { getRegistryTypes, getRegistrySchemaFields } = await import('../../src/types-source')

describe('getRegistryTypes', () => {
  it('returns all declarations keyed by script name', () => {
    const types = getRegistryTypes()
    expect(types['test-script']).toHaveLength(3)
    expect(types['empty-script']).toHaveLength(1)
  })

  it('preserves declaration metadata', () => {
    const types = getRegistryTypes()
    const opts = types['test-script'].find(d => d.name === 'TestOptions')
    expect(opts).toMatchObject({ kind: 'const', name: 'TestOptions' })
    expect(opts!.code).toContain('apiKey')
  })
})

describe('getRegistrySchemaFields', () => {
  it('extracts fields from const declarations with matching schemas', () => {
    const fields = getRegistrySchemaFields()
    expect(fields.TestOptions).toBeDefined()
    expect(fields.TestOptions).toHaveLength(2)
  })

  it('resolves field types correctly', () => {
    const fields = getRegistrySchemaFields()
    const apiKey = fields.TestOptions.find(f => f.name === 'apiKey')!
    const enabled = fields.TestOptions.find(f => f.name === 'enabled')!

    expect(apiKey.type).toBe('string')
    expect(apiKey.required).toBe(true)

    expect(enabled.type).toBe('boolean')
    expect(enabled.required).toBe(false)
  })

  it('extracts JSDoc description and @default', () => {
    const fields = getRegistrySchemaFields()
    const apiKey = fields.TestOptions.find(f => f.name === 'apiKey')!

    expect(apiKey.description).toBe('The API key.')
    expect(apiKey.defaultValue).toBe('\'abc\'')
  })

  it('extracts inline comment as description', () => {
    const fields = getRegistrySchemaFields()
    const enabled = fields.TestOptions.find(f => f.name === 'enabled')!

    expect(enabled.description).toBe('Whether tracking is enabled')
  })

  it('skips declarations ending with Defaults', () => {
    const fields = getRegistrySchemaFields()
    expect(fields.TestDefaults).toBeUndefined()
  })

  it('skips non-const declarations', () => {
    const fields = getRegistrySchemaFields()
    expect(fields.TestApi).toBeUndefined()
  })

  it('skips consts without matching schemas', () => {
    const fields = getRegistrySchemaFields()
    // Only TestOptions should be present, not TestDefaults or anything from empty-script
    expect(Object.keys(fields)).toEqual(['TestOptions'])
  })
})

describe('resolveType coverage', () => {
  it('handles all type variants', async () => {
    vi.resetModules()
    vi.doMock('../../src/registry-types.json', () => ({
      default: {
        'type-test': [
          {
            name: 'TypeTestOptions',
            kind: 'const',
            code: `export const TypeTestOptions = object({
  a: number(),
  b: array(string()),
  c: object({}),
  d: union([literal('x'), literal(42)]),
  e: record(string(), any()),
  f: custom(() => true),
  g: any(),
})`,
          },
        ],
      },
    }))

    vi.doMock('../../src/registry-schemas', () => ({
      TypeTestOptions: {
        entries: {
          a: { type: 'number' },
          b: { type: 'array', item: { type: 'string' } },
          c: { type: 'object' },
          d: {
            type: 'union',
            options: [
              { type: 'literal', literal: 'x' },
              { type: 'literal', literal: 42 },
            ],
          },
          e: { type: 'record', key: { type: 'string' }, value: { type: 'any' } },
          f: { type: 'custom' },
          g: { type: 'any' },
          h: { type: 'optional', wrapped: { type: 'unknown_type' } },
        },
      },
    }))

    const mod = await import('../../src/types-source')
    const fields = mod.getRegistrySchemaFields()
    const byName = Object.fromEntries(fields.TypeTestOptions.map(f => [f.name, f]))

    expect(byName.a.type).toBe('number')
    expect(byName.b.type).toBe('string[]')
    expect(byName.c.type).toBe('object')
    expect(byName.d.type).toBe('\'x\' | 42')
    expect(byName.e.type).toBe('Record<string, any>')
    expect(byName.f.type).toBe('Function')
    expect(byName.g.type).toBe('any')
    // unknown schema type falls through to default
    expect(byName.h.type).toBe('unknown_type')
  })
})

describe('parseComments edge cases', () => {
  it('handles fields with no comments', async () => {
    vi.resetModules()
    vi.doMock('../../src/registry-types.json', () => ({
      default: {
        'no-comments': [
          {
            name: 'NoCommentsOptions',
            kind: 'const',
            code: `export const NoCommentsOptions = object({
  plain: string(),
})`,
          },
        ],
      },
    }))

    vi.doMock('../../src/registry-schemas', () => ({
      NoCommentsOptions: {
        entries: {
          plain: { type: 'string' },
        },
      },
    }))

    const mod = await import('../../src/types-source')
    const fields = mod.getRegistrySchemaFields()
    const plain = fields.NoCommentsOptions.find(f => f.name === 'plain')!

    expect(plain.description).toBeUndefined()
    expect(plain.defaultValue).toBeUndefined()
  })

  it('handles multi-line JSDoc descriptions', async () => {
    vi.resetModules()
    vi.doMock('../../src/registry-types.json', () => ({
      default: {
        'multi-doc': [
          {
            name: 'MultiDocOptions',
            kind: 'const',
            code: `export const MultiDocOptions = object({
  /**
   * First line of description.
   * Second line of description.
   */
  field: string(),
})`,
          },
        ],
      },
    }))

    vi.doMock('../../src/registry-schemas', () => ({
      MultiDocOptions: {
        entries: {
          field: { type: 'string' },
        },
      },
    }))

    const mod = await import('../../src/types-source')
    const fields = mod.getRegistrySchemaFields()
    const field = fields.MultiDocOptions.find(f => f.name === 'field')!

    expect(field.description).toBe('First line of description. Second line of description.')
  })

  it('handles union with no options', async () => {
    vi.resetModules()
    vi.doMock('../../src/registry-types.json', () => ({
      default: {
        'empty-union': [
          {
            name: 'EmptyUnionOptions',
            kind: 'const',
            code: `export const EmptyUnionOptions = object({
  val: union([]),
})`,
          },
        ],
      },
    }))

    vi.doMock('../../src/registry-schemas', () => ({
      EmptyUnionOptions: {
        entries: {
          val: { type: 'union' },
        },
      },
    }))

    const mod = await import('../../src/types-source')
    const fields = mod.getRegistrySchemaFields()
    const val = fields.EmptyUnionOptions.find(f => f.name === 'val')!

    expect(val.type).toBe('unknown')
  })
})

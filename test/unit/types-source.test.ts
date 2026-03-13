import { describe, expect, it, vi } from 'vitest'

// Mock registry-types.json before importing the module
vi.mock('../../src/registry-types.json', () => ({
  default: {
    types: {
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
    schemaFields: {
      TestOptions: [
        { name: 'apiKey', type: 'string', required: true, description: 'The API key.', defaultValue: '\'abc\'' },
        { name: 'enabled', type: 'boolean', required: false, description: 'Whether tracking is enabled' },
      ],
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
  it('returns pre-computed schema fields', () => {
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

  it('includes JSDoc description and @default', () => {
    const fields = getRegistrySchemaFields()
    const apiKey = fields.TestOptions.find(f => f.name === 'apiKey')!

    expect(apiKey.description).toBe('The API key.')
    expect(apiKey.defaultValue).toBe('\'abc\'')
  })

  it('includes inline comment as description', () => {
    const fields = getRegistrySchemaFields()
    const enabled = fields.TestOptions.find(f => f.name === 'enabled')!

    expect(enabled.description).toBe('Whether tracking is enabled')
  })

  it('returns empty object when no schema fields exist', async () => {
    vi.resetModules()
    vi.doMock('../../src/registry-types.json', () => ({
      default: {
        types: {},
      },
    }))

    const mod = await import('../../src/types-source')
    expect(mod.getRegistrySchemaFields()).toEqual({})
  })
})

describe('backwards compatibility', () => {
  it('handles legacy JSON format without types/schemaFields wrapper', async () => {
    vi.resetModules()
    vi.doMock('../../src/registry-types.json', () => ({
      default: {
        'test-script': [
          {
            name: 'TestOptions',
            kind: 'const',
            code: 'export const TestOptions = object({})',
          },
        ],
      },
    }))

    const mod = await import('../../src/types-source')
    const types = mod.getRegistryTypes()
    expect(types['test-script']).toHaveLength(1)
    expect(mod.getRegistrySchemaFields()).toEqual({})
  })
})

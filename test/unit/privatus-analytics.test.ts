/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { getBundleResolve, registry } from '../../packages/script/src/registry'
import { useScriptPrivatusAnalytics } from '../../packages/script/src/runtime/registry/privatus-analytics'
import { PrivatusAnalyticsOptions } from '../../packages/script/src/runtime/registry/schemas'

const mocks = vi.hoisted(() => ({
  definition: undefined as any,
  useRegistryScript: vi.fn(),
}))

vi.mock('@unhead/vue', () => ({ useHead: vi.fn() }))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: mocks.useRegistryScript,
}))

function setup(options: Record<string, unknown> = { site: 'pa_AbC123' }) {
  mocks.useRegistryScript.mockImplementation((_key: string, factory: (o: any) => any) => {
    mocks.definition = factory(options)
    return { status: ref('awaitingLoad'), signal: new AbortController().signal, load: vi.fn() }
  })
  useScriptPrivatusAnalytics(options as any)
  return {
    scriptInput: mocks.definition.scriptInput as Record<string, unknown>,
    use: mocks.definition.scriptOptions.use as () => { track: (...args: any[]) => void },
  }
}

describe('privatus analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).privatus
  })

  it('loads the hosted tracker with the site id', () => {
    const { scriptInput } = setup()
    expect(scriptInput.src).toBe('https://privatusstats.com/js/pa.js')
    expect(scriptInput['data-site']).toBe('pa_AbC123')
  })

  it('pins the API origin so bundling does not change it', () => {
    // Without data-api the tracker posts to the origin it was served from,
    // which is the Nuxt origin once the script is bundled.
    const { scriptInput } = setup()
    expect(scriptInput['data-api']).toBe('https://privatusstats.com')
  })

  it('follows a custom api origin for the script and the endpoint', () => {
    const { scriptInput } = setup({ site: 'pa_AbC123', api: 'https://stats.example.com/' })
    expect(scriptInput.src).toBe('https://stats.example.com/js/pa.js')
    expect(scriptInput['data-api']).toBe('https://stats.example.com')
  })

  it('renders options as data attributes', () => {
    const { scriptInput } = setup({
      site: 'pa_AbC123',
      modules: ['engage', 'auto', 'vitals'],
      spa: 'hash',
      manual: true,
      domains: ['example.com', ' www.example.com '],
      exclude: ['/admin/*'],
      hash: true,
    })
    expect(scriptInput['data-modules']).toBe('engage,auto,vitals')
    expect(scriptInput['data-spa']).toBe('hash')
    expect(scriptInput['data-manual']).toBe('true')
    expect(scriptInput['data-domains']).toBe('example.com,www.example.com')
    expect(scriptInput['data-exclude']).toBe('/admin/*')
    expect(scriptInput['data-hash']).toBe('true')
  })

  it('leaves optional attributes off by default', () => {
    // An empty data-modules would switch the default engage module off.
    const { scriptInput } = setup()
    for (const key of ['data-modules', 'data-spa', 'data-manual', 'data-domains', 'data-exclude', 'data-hash'])
      expect(scriptInput[key]).toBeUndefined()
  })

  it('exposes the tracker global once loaded', () => {
    const track = vi.fn()
    ;(window as any).privatus = { track }
    const { use } = setup()
    use().track('Signup', { plan: 'pro' })
    expect(track).toHaveBeenCalledWith('Signup', { plan: 'pro' })
  })
})

describe('privatusAnalytics bundle.resolve', () => {
  async function getResolve() {
    const all = await registry()
    const script = all.find(s => s.registryKey === 'privatusAnalytics')!
    const resolve = getBundleResolve(script)
    if (!resolve)
      throw new Error('privatusAnalytics bundle.resolve missing')
    return resolve
  }

  it('returns false for a missing site instead of throwing', async () => {
    const resolve = await getResolve()
    expect(resolve(undefined)).toBe(false)
    expect(resolve({})).toBe(false)
  })

  it('builds the src from the api origin', async () => {
    const resolve = await getResolve()
    expect(resolve({ site: 'pa_AbC123' })).toBe('https://privatusstats.com/js/pa.js')
    expect(resolve({ site: 'pa_AbC123', api: 'https://stats.example.com/' })).toBe('https://stats.example.com/js/pa.js')
  })

  it.each(['', ' ', 'AbC123', 'pa_', 'pa_AbC 123', 'pa_AbC"123'])('skips bundling for an invalid site: %s', async (site) => {
    const resolve = await getResolve()
    expect(resolve({ site })).toBe(false)
  })
})

describe('privatusAnalytics dev validation', () => {
  function validate(options: Record<string, unknown>) {
    return (PrivatusAnalyticsOptions as any)['~standard'].validate(options) as { issues?: unknown[] }
  }

  it('accepts a site id', () => {
    expect(validate({ site: 'pa_AbC123' }).issues).toBeUndefined()
  })

  it.each(['', 'AbC123', 'pa_', 'pa_AbC-123', ' pa_AbC123 ', 'pa_AbC123"><script>'])('rejects an invalid site: %s', (site) => {
    expect(validate({ site }).issues?.length).toBeGreaterThan(0)
  })

  it('rejects an unknown spa mode', () => {
    expect(validate({ site: 'pa_AbC123', spa: 'always' }).issues?.length).toBeGreaterThan(0)
  })
})

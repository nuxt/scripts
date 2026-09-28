/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScriptStatableAnalytics } from '../../packages/script/src/runtime/registry/statable-analytics'

const mocks = vi.hoisted(() => ({
  definition: undefined as any,
  useRegistryScript: vi.fn(),
}))

vi.mock('@unhead/vue', () => ({ useHead: vi.fn() }))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: mocks.useRegistryScript,
}))

function setup(options: Record<string, unknown> = { siteId: '3270462' }) {
  mocks.useRegistryScript.mockImplementation((_key: string, factory: (o: any) => any) => {
    mocks.definition = factory(options)
    return { status: ref('awaitingLoad'), signal: new AbortController().signal, load: vi.fn() }
  })
  useScriptStatableAnalytics(options as any)
  return {
    scriptInput: mocks.definition.scriptInput as Record<string, unknown>,
    use: mocks.definition.scriptOptions.use as () => { t: (...args: any[]) => void },
  }
}

describe('statable analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).statable
  })

  it('builds the script src from the site id', () => {
    const { scriptInput } = setup()
    expect(scriptInput.src).toBe('https://statable.com/js/3270462/s.js')
  })

  it('pins the site id and the endpoint so bundling does not change them', () => {
    // The tracker reads both from its own src URL. A bundled copy is served
    // from the Nuxt origin, so the attributes have to carry them instead.
    const { scriptInput } = setup()
    expect(scriptInput['data-id']).toBe('3270462')
    expect(scriptInput['data-tracking-api']).toBe('https://statable.com/api/event')
  })

  it('follows a custom host for both the script and the endpoint', () => {
    const { scriptInput } = setup({ siteId: '3270462', host: 'https://stats.example.com/' })
    expect(scriptInput.src).toBe('https://stats.example.com/js/3270462/s.js')
    expect(scriptInput['data-tracking-api']).toBe('https://stats.example.com/api/event')
  })

  it('lets trackingApi override the endpoint on its own', () => {
    const { scriptInput } = setup({ siteId: '3270462', trackingApi: 'https://example.com/collect' })
    expect(scriptInput.src).toBe('https://statable.com/js/3270462/s.js')
    expect(scriptInput['data-tracking-api']).toBe('https://example.com/collect')
  })

  it('renders sticky props as data-statable-* attributes', () => {
    const { scriptInput } = setup({ siteId: '3270462', props: { env: 'production', cohort: 'beta' } })
    expect(scriptInput['data-statable-env']).toBe('production')
    expect(scriptInput['data-statable-cohort']).toBe('beta')
  })

  it('adds no data-statable-* attributes without props', () => {
    const { scriptInput } = setup()
    expect(Object.keys(scriptInput).filter(key => key.startsWith('data-statable-'))).toEqual([])
  })

  it('exposes the tracker global once loaded', () => {
    const t = vi.fn()
    ;(window as any).statable = { t }
    const { use } = setup()
    use().t('Sign Up', { plan: 'pro' })
    expect(t).toHaveBeenCalledWith('Sign Up', { plan: 'pro' })
  })
})

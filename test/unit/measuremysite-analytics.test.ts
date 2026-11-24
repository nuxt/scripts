/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScriptMeasuremysiteAnalytics } from '../../packages/script/src/runtime/registry/measuremysite-analytics'

const mocks = vi.hoisted(() => ({
  definition: undefined as any,
  useRegistryScript: vi.fn(),
}))

vi.mock('@unhead/vue', () => ({ useHead: vi.fn() }))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: mocks.useRegistryScript,
}))

function setup(options: Record<string, unknown> = { key: 'pk_test123' }) {
  mocks.useRegistryScript.mockImplementation((_key: string, factory: (o: any) => any) => {
    mocks.definition = factory(options)
    return { status: ref('awaitingLoad'), signal: new AbortController().signal, load: vi.fn() }
  })
  useScriptMeasuremysiteAnalytics(options as any)
  return {
    scriptInput: mocks.definition.scriptInput as Record<string, unknown>,
    use: mocks.definition.scriptOptions.use as () => { track: (...args: any[]) => void },
  }
}

describe('measuremy.site analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).measuremysite
  })

  it('loads the tracker with the site key', () => {
    const { scriptInput } = setup()
    expect(scriptInput.src).toBe('https://a.measuremy.site/t.js')
    expect(scriptInput['data-key']).toBe('pk_test123')
  })

  it('pins the endpoint so bundling does not change it', () => {
    // The tracker posts to /collect on the origin it was served from. A bundled
    // copy is served from the Nuxt origin, so data-api has to carry it instead.
    const { scriptInput } = setup()
    expect(scriptInput['data-api']).toBe('https://a.measuremy.site/collect')
  })

  it('exposes the tracker global once loaded', () => {
    const track = vi.fn()
    ;(window as any).measuremysite = { track }
    const { use } = setup()
    use().track('signup', { plan: 'pro' })
    expect(track).toHaveBeenCalledWith('signup', { plan: 'pro' })
  })
})

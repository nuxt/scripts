/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { registry, registryMeta } from '../../packages/script/src/registry'
import { useScriptDeacon } from '../../packages/script/src/runtime/registry/deacon'

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
  useScriptDeacon(options as any)
  return {
    scriptInput: mocks.definition.scriptInput as Record<string, unknown>,
    use: mocks.definition.scriptOptions?.use as () => { open: () => void },
  }
}

describe('deacon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).Deacon
  })

  it('renders the snippet from the Install page', () => {
    const { scriptInput } = setup()
    expect(scriptInput).toMatchObject({
      'src': 'https://heydeacon.com/widget/v1/loader.js',
      'data-key': 'pk_test123',
    })
  })

  it('loads the loader without CORS mode, which heydeacon.com does not serve it for', () => {
    // unhead adds crossorigin="anonymous" to cross-origin scripts. loader.js comes without
    // an Access-Control-Allow-Origin header, so the browser would block it.
    const { scriptInput } = setup()
    expect(scriptInput.crossorigin).toBe(false)
  })

  it('passes context to the loader as JSON in data-context', () => {
    const { scriptInput } = setup({ key: 'pk_test123', context: { plan: 'pro', seats: 3, trial: false } })
    expect(scriptInput['data-context']).toBe('{"plan":"pro","seats":3,"trial":false}')
  })

  // The loader only checks whether data-no-page-views is present, and unhead renders a
  // `false` value as data-no-page-views="false", so the attribute is '' or left out.
  it.each([
    [false, ''],
    [true, undefined],
    [undefined, undefined],
  ])('maps pageViews: %s onto data-no-page-views', (pageViews, attribute) => {
    const { scriptInput } = setup({ key: 'pk_test123', pageViews })
    expect(scriptInput['data-no-page-views']).toBe(attribute)
  })

  it('hands back the loader\'s window.Deacon once loaded', () => {
    const deacon = { open: vi.fn() }
    ;(window as any).Deacon = deacon
    const { use } = setup()
    expect(use?.()).toBe(deacon)
  })

  it('is registered as a support script that loads straight from heydeacon.com', async () => {
    // The loader works out where to reach Deacon from its own src, so a copy served
    // from the site's origin, bundled or proxied, would talk to the wrong host.
    const script = (await registry()).find(s => s.registryKey === 'deacon')
    expect(script).toMatchObject({
      label: 'Deacon',
      category: 'support',
      import: { name: 'useScriptDeacon' },
    })
    expect(script?.bundle).toBeUndefined()
    expect(script?.proxy).toBeUndefined()
    expect(registryMeta.find(m => m.key === 'deacon')).toEqual({
      key: 'deacon',
      label: 'Deacon',
      category: 'support',
      composableName: 'useScriptDeacon',
      capabilities: {},
      privacy: null,
    })
  })
})

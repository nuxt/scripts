/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScriptYouTubePlayer } from '../../packages/script/src/runtime/registry/youtube-player'

const mocks = vi.hoisted(() => {
  const remove = vi.fn(() => true)
  const shared: any = {
    status: undefined,
    remove,
  }
  const createHandle = () => new Proxy(shared, {})
  return {
    createHandle,
    remove,
    shared,
    useRegistryScript: vi.fn(() => createHandle()),
  }
})

vi.mock('@unhead/vue', () => ({ useHead: vi.fn() }))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: mocks.useRegistryScript,
}))

describe('youtube player lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.shared.status = ref('loaded')
    mocks.shared.remove = mocks.remove
    for (const symbol of Object.getOwnPropertySymbols(mocks.shared))
      delete (mocks.shared as any)[symbol]
    mocks.useRegistryScript.mockImplementation(() => mocks.createHandle() as any)
  })

  it('decorates the shared remove method only once across Vue proxies', () => {
    const first = useScriptYouTubePlayer({})
    const decoratedRemove = mocks.shared.remove
    const second = useScriptYouTubePlayer({})

    expect(first).not.toBe(second)
    expect(mocks.shared.remove).toBe(decoratedRemove)
    expect(second.remove).toBe(decoratedRemove)

    expect(first.remove()).toBe(true)
    expect(mocks.remove).toHaveBeenCalledOnce()
  })
})

/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  afterEach(() => {
    delete (window as any).YT
    delete (window as any).onYouTubeIframeAPIReady
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

    const afterRemove = useScriptYouTubePlayer({})
    expect(afterRemove.remove).toBe(decoratedRemove)
  })

  it('cleans readiness installed by repeated calls through the shared instance', () => {
    mocks.useRegistryScript.mockImplementation((_key: string, createOptions: () => any) => {
      const options = createOptions()
      options.clientInit?.()
      return mocks.createHandle() as any
    })

    const first = useScriptYouTubePlayer({})
    const firstReadyHandler = window.onYouTubeIframeAPIReady
    useScriptYouTubePlayer({})

    expect(window.onYouTubeIframeAPIReady).not.toBe(firstReadyHandler)
    first.remove()

    expect(window.onYouTubeIframeAPIReady).toBeUndefined()
  })

  it('preserves the receiver of a previous readiness callback', () => {
    const previousReady = vi.fn()
    window.onYouTubeIframeAPIReady = previousReady
    mocks.useRegistryScript.mockImplementation((_key: string, createOptions: () => any) => {
      const options = createOptions()
      options.clientInit?.()
      return mocks.createHandle() as any
    })

    useScriptYouTubePlayer({})
    window.onYouTubeIframeAPIReady?.()

    expect(previousReady.mock.contexts[0]).toBe(window)
  })
})

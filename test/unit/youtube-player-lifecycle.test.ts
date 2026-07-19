/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScriptYouTubePlayer } from '../../packages/script/src/runtime/registry/youtube-player'

const mocks = vi.hoisted(() => ({
  definition: undefined as any,
  useRegistryScript: vi.fn(),
}))

vi.mock('@unhead/vue', () => ({ useHead: vi.fn() }))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: mocks.useRegistryScript,
}))

function createResolverWait() {
  let cleanup: void | (() => void)
  const waitFor = (setup: (resolve: (value: any) => void, reject: (reason?: unknown) => void) => void | (() => void)) => new Promise((resolve, reject) => {
    cleanup = setup(resolve, reject)
  })
  return {
    waitFor,
    cleanup: () => cleanup?.(),
  }
}

describe('youtube player lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete window.onYouTubeIframeAPIReady
    delete (window as any).YT
    mocks.useRegistryScript.mockImplementation((_key, factory) => {
      mocks.definition = factory({})
      return {
        status: ref('awaitingLoad'),
        signal: new AbortController().signal,
      }
    })
  })

  it('resolves an API that is already ready without installing a callback', async () => {
    const YT = { Player: vi.fn() }
    ;(window as any).YT = YT
    useScriptYouTubePlayer({})
    const waitFor = vi.fn()

    const api = await mocks.definition.scriptOptions.resolve({ waitFor })

    expect(api).toEqual({ YT })
    expect(waitFor).not.toHaveBeenCalled()
  })

  it('chains and restores an existing readiness callback', async () => {
    const previousReady = vi.fn()
    window.onYouTubeIframeAPIReady = previousReady
    useScriptYouTubePlayer({})
    const resolver = createResolverWait()
    const apiPromise = mocks.definition.scriptOptions.resolve(resolver)
    const installedReady = window.onYouTubeIframeAPIReady
    const YT = { Player: vi.fn() }
    ;(window as any).YT = YT

    installedReady?.()

    await expect(apiPromise).resolves.toEqual({ YT })
    expect(previousReady).toHaveBeenCalledOnce()
    expect(window.onYouTubeIframeAPIReady).toBe(previousReady)
  })

  it('restores the vendor callback when the lifecycle wait is cleaned up', () => {
    const previousReady = vi.fn()
    window.onYouTubeIframeAPIReady = previousReady
    useScriptYouTubePlayer({})
    const resolver = createResolverWait()
    void mocks.definition.scriptOptions.resolve(resolver)

    resolver.cleanup()

    expect(window.onYouTubeIframeAPIReady).toBe(previousReady)
  })
})

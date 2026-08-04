/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const mocks = vi.hoisted(() => ({
  createFetch: vi.fn((options: { baseURL: string }) => ({ baseURL: options.baseURL })),
  state: {} as Record<string, any>,
}))

vi.mock('@nuxt/devtools-kit/iframe-client', () => ({
  onDevtoolsClientConnected: vi.fn(() => vi.fn()),
}))

vi.mock('ofetch', () => ({
  ofetch: { create: mocks.createFetch },
}))

vi.mock('../../packages/devtools-app/composables/state', async () => {
  const { ref } = await import('vue')
  Object.assign(mocks.state, {
    firstPartyData: ref(null),
    isConnected: ref(false),
    path: ref(''),
    query: ref({}),
    refreshSources: vi.fn(),
    standaloneUrl: ref(''),
    syncScripts: vi.fn(),
    version: ref(null),
  })
  return mocks.state
})

describe('standalone devtools connection', () => {
  it('reconnects when its URL changes and disconnects when cleared', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new DOMException('Unavailable', 'NetworkError'))))
    window.matchMedia = vi.fn(() => ({ matches: false })) as any
    const { useDevtoolsConnection } = await import('../../packages/devtools-app/composables/rpc')
    const dispose = useDevtoolsConnection()

    mocks.state.standaloneUrl.value = 'http://localhost:3000'
    await nextTick()
    await vi.waitFor(() => expect(mocks.createFetch).toHaveBeenLastCalledWith({ baseURL: 'http://localhost:3000' }))
    mocks.state.isConnected.value = true
    mocks.createFetch.mockClear()

    mocks.state.standaloneUrl.value = 'http://localhost:4000'
    await nextTick()
    expect(mocks.createFetch).toHaveBeenLastCalledWith({ baseURL: 'http://localhost:4000' })

    mocks.state.isConnected.value = true
    mocks.state.standaloneUrl.value = ''
    await nextTick()
    expect(mocks.state.isConnected.value).toBe(false)

    dispose()
    window.dispatchEvent(new Event('beforeunload'))
  })
})

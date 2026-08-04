import { describe, expect, it, vi } from 'vitest'
import { createNpmScriptApiState } from '../../packages/script/src/runtime/npm-script-api-state'

describe('createNpmScriptApiState', () => {
  it('switches a queued API proxy to the live API after loading', async () => {
    const queuedApi = { track: vi.fn(() => 'queued') }
    const liveApi = { track: vi.fn(() => 'live') }
    let initialized = false
    const resolveApi = () => initialized ? liveApi : queuedApi
    const state = createNpmScriptApiState(resolveApi)

    expect(state.current()).toBe(queuedApi)
    initialized = true
    await expect(state.load(resolveApi, undefined)).resolves.toBe(liveApi)
    expect(state.current()).toBe(liveApi)
  })
})

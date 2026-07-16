import { describe, expect, it, vi } from 'vitest'
import { createNpmScriptStub } from '../../packages/script/src/runtime/npm-script-stub'

vi.mock('../../packages/script/src/runtime/logger', () => ({
  logger: { error: vi.fn() },
}))

describe('npm script stub lifecycle', () => {
  it('does not retain callbacks registered after initialization fails', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const beforeFailure = vi.fn()
    const afterFailure = vi.fn()
    const stub = createNpmScriptStub({
      key: 'failing-script',
      clientInit: () => Promise.reject(new Error('initialization failed')),
    })

    stub.onLoaded(beforeFailure)
    await stub.load()
    stub.onLoaded(afterFailure)
    await stub.load()

    expect(stub.status.value).toBe('error')
    expect(beforeFailure).not.toHaveBeenCalled()
    expect(afterFailure).not.toHaveBeenCalled()
  })
})

/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest'
import { useScriptRedditPixel } from '../../packages/script/src/runtime/registry/reddit-pixel'

const mocks = vi.hoisted(() => ({
  definition: undefined as any,
}))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: (_key: string, factory: (o: any) => any, options: any) => {
    mocks.definition = factory(options)
    return {}
  },
}))

describe('reddit pixel stub', () => {
  it('forwards calls to sendEvent with the command as the first argument once pixel.js has loaded', () => {
    useScriptRedditPixel({ id: 'a2_test' })
    mocks.definition.clientInit()
    const sendEvent = vi.fn()
    window.rdt.sendEvent = sendEvent
    window.rdt('track', 'SignUp')
    expect(sendEvent).toHaveBeenCalledWith('track', 'SignUp')
  })
})

/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScriptMetaPixel } from '../../packages/script/src/runtime/registry/meta-pixel'
import { useScriptRedditPixel } from '../../packages/script/src/runtime/registry/reddit-pixel'
import { useScriptSnapchatPixel } from '../../packages/script/src/runtime/registry/snapchat-pixel'
import { useScriptXPixel } from '../../packages/script/src/runtime/registry/x-pixel'

const mocks = vi.hoisted(() => ({ definition: undefined as any }))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: (_key: string, factory: (options: any) => any, options: any) => {
    mocks.definition = factory(options)
    return {}
  },
}))

describe('x Pixel stub', () => {
  beforeEach(() => {
    useScriptXPixel({ id: 'test-pixel' })
    mocks.definition.clientInit()
  })

  it('queues event arguments before the SDK loads', () => {
    const properties = { value: 10, currency: 'USD', contents: [] }
    window.twq('event', 'test-purchase', properties)
    expect(window.twq.queue).toEqual([
      ['config', 'test-pixel'],
      ['event', 'test-purchase', properties],
    ])
  })

  it('forwards event arguments and the stub receiver after the SDK loads', () => {
    const execute = vi.fn()
    ;(window.twq as any).exe = execute
    const properties = { value: 10, currency: 'USD', contents: [] }

    window.twq('event', 'test-purchase', properties)

    expect(execute).toHaveBeenCalledExactlyOnceWith('event', 'test-purchase', properties)
    expect(execute.mock.contexts[0]).toBe(window.twq)
  })
})

// Check the same queued-to-live boundary for the other callable pixel stubs.
it.each([
  ['Meta', useScriptMetaPixel, 'fbq', 'callMethod'],
  ['Reddit', useScriptRedditPixel, 'rdt', 'sendEvent'],
  ['Snapchat', useScriptSnapchatPixel, 'snaptr', 'handleRequest'],
] as const)('%s forwards the command and receiver after loading', (_name, usePixel, globalKey, dispatcher) => {
  usePixel({ id: 'test-pixel' })
  mocks.definition.clientInit()
  const stub = (window as any)[globalKey]
  const execute = vi.fn()
  stub[dispatcher] = execute
  const properties = { value: 10, currency: 'USD' }

  stub('track', 'Purchase', properties)

  expect(execute).toHaveBeenCalledExactlyOnceWith('track', 'Purchase', properties)
  expect(execute.mock.contexts[0]).toBe(stub)
})

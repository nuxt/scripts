/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScriptPulseAnalytics } from '../../packages/script/src/runtime/registry/pulse-analytics'

const mocks = vi.hoisted(() => ({
  definition: undefined as any,
  useRegistryScript: vi.fn(),
}))

vi.mock('@unhead/vue', () => ({ useHead: vi.fn() }))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: mocks.useRegistryScript,
}))

const QUEUE_KEY = Symbol.for('nuxt-scripts.pulse-queue')

function queue(): unknown[] {
  return (globalThis as any)[QUEUE_KEY]?.queue ?? []
}

function setup(options: Record<string, unknown> = { domain: 'example.com' }) {
  mocks.useRegistryScript.mockImplementation((_key: string, factory: (o: any) => any) => {
    mocks.definition = factory(options)
    return { status: ref('awaitingLoad'), signal: new AbortController().signal, load: vi.fn() }
  })
  useScriptPulseAnalytics(options as any)
  const use = mocks.definition.scriptOptions.use as () => { track: (...args: any[]) => void, cleanPath: () => string | null }
  return { use, scriptInput: mocks.definition.scriptInput as Record<string, unknown> }
}

describe('pulse analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (globalThis as any)[QUEUE_KEY]
    delete (window as any).pulse
    delete window.__pulseInstalled
  })

  describe('script input', () => {
    it('writes only data-domain by default', () => {
      const { scriptInput } = setup()
      expect(scriptInput).toEqual({
        'src': 'https://js.ciphera.net/script.js',
        'data-domain': 'example.com',
        'data-api': undefined,
        'data-no-scroll': undefined,
        'data-no-outbound': undefined,
        'data-no-downloads': undefined,
      })
    })

    it('writes a presence flag (empty string, never a boolean) only for options set to false', () => {
      // The tracker reads data-no-* with hasAttribute(), and Unhead renders a
      // `false` prop as data-x="false", which would still count as present.
      const { scriptInput } = setup({ domain: 'example.com', apiUrl: 'https://pulse-api.example.com', trackScroll: false, trackOutbound: true })
      expect(scriptInput['data-api']).toBe('https://pulse-api.example.com')
      expect(scriptInput['data-no-scroll']).toBe('')
      expect(scriptInput['data-no-outbound']).toBeUndefined()
      expect(scriptInput['data-no-downloads']).toBeUndefined()
    })
  })

  describe('queue', () => {
    it('queues track() before load and replays in order with full arguments once the tracker is ready', () => {
      const { use } = setup()
      const api = use()
      api.track('signup', { plan: 'pro' })
      api.track('purchase', { product: 'annual_plan' }, 99)
      expect(queue()).toHaveLength(2)

      const track = vi.fn()
      window.__pulseInstalled = true
      window.pulse = { track, cleanPath: () => '/' }
      use() // use() runs again on the status change
      expect(track.mock.calls).toEqual([
        ['signup', { plan: 'pro' }, undefined],
        ['purchase', { product: 'annual_plan' }, 99],
      ])
      expect(queue()).toHaveLength(0)

      api.track('later')
      expect(track).toHaveBeenLastCalledWith('later', undefined, undefined)
      expect(queue()).toHaveLength(0)
    })

    it('drops the queue and stops queuing once the tracker has run and declined (visitor opted out)', () => {
      const { use } = setup()
      const api = use()
      api.track('before')
      expect(queue()).toHaveLength(1)

      // The tracker sets __pulseInstalled first, then exits on Do Not Track /
      // Global Privacy Control without ever defining window.pulse.
      window.__pulseInstalled = true
      use()
      expect(queue()).toHaveLength(0)

      api.track('after')
      expect(queue()).toHaveLength(0)
    })

    it('keeps draining the queue when one replayed call throws', () => {
      const { use } = setup()
      const api = use()
      api.track('first')
      api.track('second')
      api.track('third')

      const track = vi.fn((name: string) => {
        if (name === 'first')
          throw new Error('tracker rejected the event')
      })
      window.__pulseInstalled = true
      window.pulse = { track, cleanPath: () => '/' }
      expect(() => use()).not.toThrow()
      expect(track.mock.calls.map(call => call[0])).toEqual(['first', 'second', 'third'])
      expect(queue()).toHaveLength(0)
    })

    it('caps the queue when the tracker never runs', () => {
      const { use } = setup()
      const api = use()
      for (let i = 0; i < 150; i++)
        api.track(`event_${i}`)
      expect(queue()).toHaveLength(100)
    })

    it('cleanPath() is null before load and the tracker value after', () => {
      const { use } = setup()
      expect(use().cleanPath()).toBeNull()
      window.__pulseInstalled = true
      window.pulse = { track: vi.fn(), cleanPath: () => '/pricing' }
      expect(use().cleanPath()).toBe('/pricing')
    })
  })
})

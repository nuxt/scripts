import { describe, expect, it, vi } from 'vitest'
import { createNpmScriptProxy } from '../../packages/script/src/runtime/npm-script-proxy'

describe('createNpmScriptProxy', () => {
  it('preserves method return values and receivers after the SDK resolves', () => {
    const queuedTrack = vi.fn()
    const fallback = {
      track: queuedTrack,
    }
    let api: { prefix: string, track: (value: string) => string } | undefined
    const proxy = createNpmScriptProxy(fallback, () => api)
    const retainedTrack = proxy.track

    expect(retainedTrack('before')).toBeUndefined()
    expect(queuedTrack).toHaveBeenCalledWith('before')

    api = {
      prefix: 'tracked',
      track(value) {
        return `${this.prefix}:${value}`
      },
    }

    expect(proxy.track).toBe(retainedTrack)
    expect(retainedTrack('after')).toBe('tracked:after')
    expect(proxy.prefix).toBe('tracked')
  })
})

/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { afterNextPaint } from '../../packages/script/src/runtime/utils/after-next-paint'

describe('afterNextPaint', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the callback after exactly two requestAnimationFrame invocations', () => {
    const cb = vi.fn()
    afterNextPaint(cb)

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenCalledOnce()
  })

  it('does NOT call the callback synchronously (before rAF fires)', () => {
    // Replace with a non-firing mock to verify sync non-call
    vi.mocked(window.requestAnimationFrame).mockImplementation(() => 0)

    const cb = vi.fn()
    afterNextPaint(cb)

    expect(cb).not.toHaveBeenCalled()
  })

  it('does NOT call the callback after only one rAF', () => {
    let outerCb: FrameRequestCallback | undefined
    vi.mocked(window.requestAnimationFrame)
      .mockImplementationOnce((cb) => {
        outerCb = cb
        return 0
      }) // capture outer rAF
      .mockImplementation(() => 0) // inner rAF: don't fire

    const cb = vi.fn()
    afterNextPaint(cb)

    // Fire outer rAF — registers inner rAF but does NOT call cb yet
    outerCb!(0)
    expect(cb).not.toHaveBeenCalled()
  })

  it('cancels pending frames and releases the callback', () => {
    const callbacks: FrameRequestCallback[] = []
    vi.mocked(window.requestAnimationFrame).mockImplementation((cb) => {
      callbacks.push(cb)
      return callbacks.length
    })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const cb = vi.fn()

    const stop = afterNextPaint(cb)
    callbacks[0]!(0)
    stop()
    callbacks[1]!(0)

    expect(cb).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledTimes(2)
  })
})

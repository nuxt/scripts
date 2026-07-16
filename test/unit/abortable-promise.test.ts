import { describe, expect, it, vi } from 'vitest'
import { createAbortablePromise } from '../../packages/script/src/runtime/utils/abortable-promise'

describe('createAbortablePromise', () => {
  it('runs cleanup once when resolved', async () => {
    const cleanup = vi.fn()
    const promise = createAbortablePromise<number>((resolve) => {
      resolve(42)
      return cleanup
    })

    await expect(promise).resolves.toBe(42)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('rejects with AbortError and runs cleanup when aborted', async () => {
    const controller = new AbortController()
    const cleanup = vi.fn()
    const promise = createAbortablePromise<void>(() => cleanup, {
      signal: controller.signal,
      abortMessage: 'SDK readiness wait was aborted',
    })

    controller.abort()

    await expect(promise).rejects.toMatchObject({
      name: 'AbortError',
      message: 'SDK readiness wait was aborted',
    })
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('does not run setup for an already-aborted signal', async () => {
    const controller = new AbortController()
    const setup = vi.fn()
    controller.abort()

    await expect(createAbortablePromise(setup, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(setup).not.toHaveBeenCalled()
  })

  it('routes synchronous setup failures to rejection', async () => {
    const error = new Error('setup failed')

    await expect(createAbortablePromise(() => {
      throw error
    })).rejects.toBe(error)
  })
})

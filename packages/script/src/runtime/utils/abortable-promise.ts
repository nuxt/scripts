export interface AbortablePromiseOptions {
  signal?: AbortSignal
  abortMessage?: string
}

type PromiseSetup<T> = (
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (reason?: unknown) => void,
) => void | (() => void)

export function createAbortError(message = 'Operation aborted'): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

export function createAbortablePromise<T>(
  setup: PromiseSetup<T>,
  options: AbortablePromiseOptions = {},
): Promise<T> {
  const { signal, abortMessage } = options
  return new Promise<T>((outerResolve, outerReject) => {
    let settled = false
    let cleanup: (() => void) | undefined
    let onAbort: () => void

    const finish = (settle: (value: any) => void, value?: unknown) => {
      if (settled)
        return
      settled = true
      signal?.removeEventListener('abort', onAbort)
      const currentCleanup = cleanup
      cleanup = undefined
      try {
        currentCleanup?.()
      }
      catch (error) {
        outerReject(error)
        return
      }
      settle(value)
    }
    const reject = (reason?: unknown) => finish(outerReject, reason)
    const resolve = (value: T | PromiseLike<T>) => {
      if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
        let then: unknown
        try {
          then = (value as PromiseLike<T>).then
        }
        catch (error) {
          reject(error)
          return
        }
        if (typeof then === 'function') {
          Promise.resolve(value).then(
            resolved => finish(outerResolve, resolved),
            reject,
          )
          return
        }
      }
      finish(outerResolve, value)
    }
    onAbort = () => reject(createAbortError(abortMessage))

    if (signal?.aborted) {
      onAbort()
      return
    }

    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      cleanup = setup(resolve, reject) || undefined
      if (settled) {
        cleanup?.()
        cleanup = undefined
      }
    }
    catch (error) {
      reject(error)
    }
  })
}

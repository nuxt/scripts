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
    let setupComplete = false
    let cleanup: (() => void) | undefined
    let onAbort: () => void
    let pendingSettlement: { settle: (value: any) => void, value?: unknown } | undefined

    const settleNow = (settle: (value: any) => void, value?: unknown) => {
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
    const finish = (settle: (value: any) => void, value?: unknown) => {
      if (settled || pendingSettlement)
        return
      if (!setupComplete) {
        pendingSettlement = { settle, value }
        return
      }
      settleNow(settle, value)
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
      setupComplete = true
      onAbort()
      return
    }

    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      cleanup = setup(resolve, reject) || undefined
      setupComplete = true
      if (pendingSettlement) {
        const { settle, value } = pendingSettlement
        pendingSettlement = undefined
        settleNow(settle, value)
      }
    }
    catch (error) {
      setupComplete = true
      if (pendingSettlement) {
        const { settle, value } = pendingSettlement
        pendingSettlement = undefined
        settleNow(settle, value)
      }
      else {
        reject(error)
      }
    }
  })
}
